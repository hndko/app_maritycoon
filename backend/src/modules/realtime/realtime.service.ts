import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getSessionTokenSecret } from '../../infrastructure/config/env.validation';
import { GameRepository } from '../game/game.repository';
import { RoomPlayerRecord, RoomsRepository } from '../rooms/rooms.repository';
import { ChatMessageSocketDto } from './dto/chat-message-socket.dto';
import { JoinRoomSocketDto } from './dto/join-room-socket.dto';
import { RealtimeStateStore } from './realtime-state.store';
import {
  ChatBroadcastPayload,
  DiceRolledPayload,
  GameFinishedPayload,
  GameStartedPayload,
  GameplayState,
  CardDrawPayload,
  PendingAction,
  PlayerBankruptPayload,
  PlayerMovedPayload,
  RealtimePlayer,
  RentPaidPayload,
  RoomStatePayload,
  SocketSession,
  TurnChangedPayload,
} from './realtime.types';

const boardSize = 40;
const startBonus = 2000000;
const jailFine = 500000;
const jailPosition = 10;
const goToJailPosition = 30;
const taxAmounts = new Map<number, number>([
  [4, 200000],
  [38, 1000000],
]);

type CardDefinition = CardDrawPayload & {
  effect:
    | { type: 'receive_money'; amount: number }
    | { type: 'pay_money'; amount: number }
    | { type: 'move_to'; position: number }
    | { type: 'move_steps'; steps: number }
    | { type: 'go_to_jail' }
    | { type: 'get_out_of_jail' };
};

const chanceCards: readonly CardDefinition[] = [
  {
    deck: 'chance',
    card_id: 'chance_umkm',
    title: 'Bantuan UMKM',
    description: 'Dapat bantuan UMKM Rp500.000.',
    effect: { type: 'receive_money', amount: 500000 },
  },
  {
    deck: 'chance',
    card_id: 'chance_vehicle_tax',
    title: 'Pajak Kendaraan',
    description: 'Bayar pajak kendaraan Rp300.000.',
    effect: { type: 'pay_money', amount: 300000 },
  },
  {
    deck: 'chance',
    card_id: 'chance_jakarta',
    title: 'Maju ke Jakarta',
    description: 'Maju ke Jakarta.',
    effect: { type: 'move_to', position: 37 },
  },
  {
    deck: 'chance',
    card_id: 'chance_back_three',
    title: 'Mundur 3 Langkah',
    description: 'Mundur 3 langkah.',
    effect: { type: 'move_steps', steps: -3 },
  },
  {
    deck: 'chance',
    card_id: 'chance_go_jail',
    title: 'Masuk Penjara',
    description: 'Langsung masuk penjara.',
    effect: { type: 'go_to_jail' },
  },
  {
    deck: 'chance',
    card_id: 'chance_thr',
    title: 'Bonus THR',
    description: 'Dapat bonus THR Rp700.000.',
    effect: { type: 'receive_money', amount: 700000 },
  },
];

const communityChestCards: readonly CardDefinition[] = [
  {
    deck: 'community_chest',
    card_id: 'community_village',
    title: 'Menang Lomba Desa',
    description: 'Dapat hadiah Rp400.000.',
    effect: { type: 'receive_money', amount: 400000 },
  },
  {
    deck: 'community_chest',
    card_id: 'community_scholarship',
    title: 'Beasiswa',
    description: 'Dapat beasiswa Rp600.000.',
    effect: { type: 'receive_money', amount: 600000 },
  },
  {
    deck: 'community_chest',
    card_id: 'community_hospital',
    title: 'Biaya Rumah Sakit',
    description: 'Bayar biaya rumah sakit Rp350.000.',
    effect: { type: 'pay_money', amount: 350000 },
  },
  {
    deck: 'community_chest',
    card_id: 'community_inheritance',
    title: 'Warisan',
    description: 'Dapat warisan Rp800.000.',
    effect: { type: 'receive_money', amount: 800000 },
  },
  {
    deck: 'community_chest',
    card_id: 'community_jail_free',
    title: 'Bebas Penjara',
    description: 'Simpan kartu bebas penjara.',
    effect: { type: 'get_out_of_jail' },
  },
];

@Injectable()
export class RealtimeService {
  private readonly timerLockOwner = `realtime:${process.pid}:${randomUUID()}`;

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly gameRepository: GameRepository,
    private readonly stateStore: RealtimeStateStore,
  ) {}

  async joinRoom(socketId: string, input: JoinRoomSocketDto): Promise<RoomStatePayload> {
    const room = await this.roomsRepository.findById(input.room_id);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const player = await this.roomsRepository.findPlayerInRoom(
      input.room_id,
      input.player_id,
    );

    if (!player) {
      throw new ForbiddenException('Player is not part of this room');
    }

    if (player.player_name !== input.user_nickname.trim()) {
      throw new BadRequestException('Player nickname does not match room slot');
    }

    this.verifySessionToken(input.session_token, input.room_id, input.player_id);

    await this.stateStore.markConnected(input.room_id, input.player_id, socketId);
    return this.getRoomState(input.room_id);
  }

  async disconnect(socketId: string): Promise<{
    session: SocketSession;
    state: RoomStatePayload;
    turnChanged: TurnChangedPayload | null;
  } | null> {
    const session = await this.stateStore.getSocketSession(socketId);

    if (!session) {
      return null;
    }

    const player = await this.roomsRepository.findPlayerInRoom(
      session.roomId,
      session.playerId,
    );

    await this.stateStore.clearSocketSession(socketId);
    await this.stateStore.markDisconnected(session.roomId, session.playerId);
    const skipped = await this.skipTurnIfCurrentPlayerUnavailable(
      session.roomId,
      session.playerId,
      'disconnect',
    );

    return {
      session: {
        socketId,
        roomId: session.roomId,
        playerId: session.playerId,
        playerName: player?.player_name ?? 'Unknown Player',
      },
      state: await this.getRoomState(session.roomId),
      turnChanged: skipped,
    };
  }

  async createChatBroadcast(
    session: SocketSession,
    input: ChatMessageSocketDto,
  ): Promise<ChatBroadcastPayload> {
    const isAllowed = await this.stateStore.assertChatAllowed(
      session.roomId,
      session.playerId,
    );

    if (!isAllowed) {
      throw new HttpException('Chat rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    const payload: ChatBroadcastPayload = {
      room_id: session.roomId,
      sender_name: session.playerName,
      message: input.message.trim(),
      type: 'user',
      timestamp: new Date().toISOString(),
    };

    await this.gameRepository.appendLog(session.roomId, 'chat_message', payload);
    return payload;
  }

  async setReady(session: SocketSession, isReady: boolean): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'set_ready');
    const room = await this.roomsRepository.findById(session.roomId);

    if (!room || room.status !== 'waiting') {
      throw new ConflictException('Ready status can only change in waiting rooms');
    }

    await this.roomsRepository.setPlayerReady(session.roomId, session.playerId, isReady);
    await this.gameRepository.appendLog(session.roomId, 'ready_changed', {
      player_id: session.playerId,
      is_ready: isReady,
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async kickPlayer(session: SocketSession, targetPlayerId: string): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'kick_player');
    await this.assertHost(session, ['waiting']);

    if (targetPlayerId === session.playerId) {
      throw new ConflictException('Host cannot kick self');
    }

    await this.roomsRepository.removePlayer(session.roomId, targetPlayerId);
    await this.gameRepository.appendLog(session.roomId, 'player_kicked', {
      player_id: targetPlayerId,
      host_id: session.playerId,
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async transferHost(session: SocketSession, targetPlayerId: string): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'transfer_host');
    await this.assertHost(session, ['waiting']);

    if (targetPlayerId === session.playerId) {
      throw new ConflictException('Player is already host');
    }

    const target = await this.roomsRepository.findPlayerInRoom(session.roomId, targetPlayerId);

    if (!target) {
      throw new NotFoundException('Target player not found');
    }

    await this.roomsRepository.transferHost(session.roomId, session.playerId, targetPlayerId);
    await this.gameRepository.appendLog(session.roomId, 'host_transferred', {
      from_player_id: session.playerId,
      to_player_id: targetPlayerId,
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async updateRoomSettings(
    session: SocketSession,
    input: {
      room_name: string;
      max_players: number;
      starting_money: number;
      turn_timer_seconds: number;
    },
  ): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'update_room_settings');
    await this.assertHost(session, ['waiting']);
    const players = await this.roomsRepository.listPlayers(session.roomId);

    if (input.max_players < players.length) {
      throw new ConflictException('Max players cannot be below current player count');
    }

    await this.roomsRepository.updateRoomSettings({
      roomId: session.roomId,
      roomName: input.room_name.trim(),
      maxPlayers: input.max_players,
      startingMoney: input.starting_money,
      turnTimerSeconds: input.turn_timer_seconds,
    });
    await this.gameRepository.appendLog(session.roomId, 'room_settings_updated', {
      host_id: session.playerId,
      ...input,
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async endGameByHost(session: SocketSession): Promise<{
    finished: GameFinishedPayload;
    state: RoomStatePayload;
  }> {
    await this.assertSocketActionAllowed(session, 'end_game');
    await this.assertHost(session, ['waiting', 'playing']);
    const players = await this.roomsRepository.listPlayers(session.roomId);
    const leaderboard = await this.buildLeaderboard(session.roomId, players);
    const winner = leaderboard[0];

    if (!winner) {
      throw new ConflictException('Cannot finish an empty room');
    }

    const finished: GameFinishedPayload = {
      winner_id: winner.player_id,
      leaderboard,
    };
    const gameplay = await this.stateStore.getGameplayState(session.roomId);

    await this.roomsRepository.finishRoom(session.roomId);
    if (gameplay) {
      await this.stateStore.setGameplayState(session.roomId, {
        ...gameplay,
        phase: 'finished',
        winner_id: winner.player_id,
        pending_action: null,
        turn_deadline_at: null,
        turn_started_at: null,
      });
    }
    await this.gameRepository.appendLog(session.roomId, 'game_finished_by_host', {
      ...finished,
      host_id: session.playerId,
    });

    return {
      finished,
      state: await this.getRoomState(session.roomId),
    };
  }

  async startGame(session: SocketSession): Promise<{
    started: GameStartedPayload;
    state: RoomStatePayload;
  }> {
    await this.assertSocketActionAllowed(session, 'start_game');
    const room = await this.roomsRepository.findById(session.roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new ConflictException('Game can only be started from waiting room');
    }

    const players = await this.roomsRepository.listPlayers(session.roomId);
    const actor = players.find((player) => player.id === session.playerId);

    if (!actor?.is_host) {
      throw new ForbiddenException('Only host can start the game');
    }

    if (players.length < 2) {
      throw new ConflictException('At least two players are required to start');
    }

    if (players.some((player) => !player.is_host && !player.is_ready)) {
      throw new ConflictException('All non-host players must be ready');
    }

    const started = await this.roomsRepository.startGame(
      session.roomId,
      room.starting_money,
    );
    await this.gameRepository.initializeRoomProperties(session.roomId);
    await this.stateStore.setGameplayState(session.roomId, {
      current_player_id: started.first_turn_player_id,
      phase: 'await_roll',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
      jail_turns_by_player_id: {},
      jail_free_card_player_ids: [],
      chance_deck: chanceCards.map((card) => card.card_id),
      community_chest_deck: communityChestCards.map((card) => card.card_id),
      last_card: null,
      ...this.createTurnDeadline(room.turn_timer_seconds),
    });
    const payload: GameStartedPayload = {
      room_id: session.roomId,
      first_turn_player_id: started.first_turn_player_id,
    };

    await this.gameRepository.appendLog(session.roomId, 'game_started', payload);

    return {
      started: payload,
      state: await this.getRoomState(session.roomId, started.players),
    };
  }

  async rollDice(session: SocketSession): Promise<{
    diceRolled: DiceRolledPayload;
    moved: PlayerMovedPayload | null;
    rentPaid: RentPaidPayload | null;
    bankrupt: PlayerBankruptPayload | null;
    finished: GameFinishedPayload | null;
    state: RoomStatePayload;
  }> {
    await this.assertSocketActionAllowed(session, 'roll_dice');
    const { gameplay, player } = await this.assertCurrentPlayer(session, ['await_roll']);
    let nextGameplay = gameplay;

    const dice = this.rollTwoDice();
    const diceRolled: DiceRolledPayload = {
      player_id: session.playerId,
      dice_1: dice.dice_1,
      dice_2: dice.dice_2,
      total: dice.total,
      is_double: dice.is_double,
    };
    const isJailed = gameplay.jailed_player_ids.includes(session.playerId);

    if (isJailed && !dice.is_double) {
      const attempts = (gameplay.jail_turns_by_player_id?.[session.playerId] ?? 0) + 1;

      if (attempts < 3) {
        await this.stateStore.setGameplayState(session.roomId, {
          ...gameplay,
          dice,
          phase: 'free_action',
          pending_action: null,
          jail_turns_by_player_id: {
            ...(gameplay.jail_turns_by_player_id ?? {}),
            [session.playerId]: attempts,
          },
        });
        await this.gameRepository.appendLog(session.roomId, 'jail_roll_failed', {
          player_id: session.playerId,
          attempts,
        });

        return {
          diceRolled,
          moved: null,
          rentPaid: null,
          bankrupt: null,
          finished: null,
          state: await this.getRoomState(session.roomId),
        };
      }

      if (player.money < jailFine) {
        const bankruptcy = await this.bankruptPlayer(session.roomId, session.playerId, null);
        return {
          diceRolled,
          moved: null,
          rentPaid: null,
          bankrupt: bankruptcy.bankrupt,
          finished: bankruptcy.finished,
          state: await this.getRoomState(session.roomId),
        };
      }

      await this.gameRepository.addPlayerMoney(session.playerId, -jailFine);
      await this.gameRepository.appendLog(session.roomId, 'jail_fine_paid', {
        player_id: session.playerId,
        amount: jailFine,
        reason: 'third_failed_double',
      });
      nextGameplay = this.releaseFromJail(gameplay, session.playerId);
    }

    if (isJailed && dice.is_double) {
      nextGameplay = this.releaseFromJail(gameplay, session.playerId);
      await this.gameRepository.appendLog(session.roomId, 'jail_released_by_double', {
        player_id: session.playerId,
      });
    }

    const nextDoubleCount = dice.is_double && !isJailed ? nextGameplay.double_count + 1 : 0;
    await this.gameRepository.appendLog(session.roomId, 'dice_rolled', diceRolled);

    if (nextDoubleCount >= 3) {
      await this.gameRepository.updatePlayerPosition(session.playerId, jailPosition);
      nextGameplay = {
        ...nextGameplay,
        double_count: 0,
        dice: { ...dice, rolled_at: new Date().toISOString() },
        phase: 'free_action',
        pending_action: null,
        jailed_player_ids: this.addUnique(nextGameplay.jailed_player_ids, session.playerId),
        turn_started_at: gameplay.turn_started_at,
        turn_deadline_at: gameplay.turn_deadline_at,
      };
      await this.stateStore.setGameplayState(session.roomId, nextGameplay);
      await this.gameRepository.appendLog(session.roomId, 'sent_to_jail', {
        player_id: session.playerId,
        reason: 'triple_double',
      });

      return {
        diceRolled,
        moved: {
          player_id: session.playerId,
          old_position: player.position,
          new_position: jailPosition,
          passed_start: false,
        },
        rentPaid: null,
        bankrupt: null,
        finished: null,
        state: await this.getRoomState(session.roomId),
      };
    }

    const oldPosition = player.position;
    const newPosition = (oldPosition + dice.total) % boardSize;
    const passedStart = oldPosition + dice.total >= boardSize;
    await this.gameRepository.updatePlayerPosition(session.playerId, newPosition);

    if (passedStart) {
      await this.gameRepository.addPlayerMoney(session.playerId, startBonus);
      await this.gameRepository.appendLog(session.roomId, 'start_bonus', {
        player_id: session.playerId,
        amount: startBonus,
      });
    }

    const tileResolution = await this.resolveTile(
      session.roomId,
      session.playerId,
      newPosition,
      nextDoubleCount,
      { ...dice, rolled_at: new Date().toISOString() },
    );
    if (!tileResolution.bankrupt) {
      await this.stateStore.setGameplayState(session.roomId, tileResolution.gameplay);
    }

    return {
      diceRolled,
      moved: {
        player_id: session.playerId,
        old_position: oldPosition,
        new_position: newPosition,
        passed_start: passedStart,
      },
      rentPaid: tileResolution.rentPaid,
      bankrupt: tileResolution.bankrupt,
      finished: tileResolution.finished,
      state: await this.getRoomState(session.roomId),
    };
  }

  async buyProperty(session: SocketSession, propertyId: number): Promise<{
    state: RoomStatePayload;
  }> {
    await this.assertSocketActionAllowed(session, 'buy_property');
    const { gameplay, player } = await this.assertCurrentPlayer(session, ['await_action']);
    const pending = gameplay.pending_action;

    if (
      !pending ||
      pending.type !== 'buy_property' ||
      pending.player_id !== session.playerId ||
      pending.property_id !== propertyId
    ) {
      throw new ConflictException('No matching property purchase is pending');
    }

    if (player.money < pending.price) {
      throw new ConflictException('Not enough money to buy property');
    }

    await this.gameRepository.buyProperty(session.roomId, propertyId, session.playerId, pending.price);
    await this.gameRepository.appendLog(session.roomId, 'property_bought', {
      player_id: session.playerId,
      property_id: propertyId,
      price: pending.price,
    });
    await this.stateStore.setGameplayState(session.roomId, {
      ...gameplay,
      phase: 'free_action',
      pending_action: null,
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async buildHouse(session: SocketSession, propertyId: number): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'build_house');
    const { gameplay, player } = await this.assertCurrentPlayer(session, [
      'await_action',
      'free_action',
    ]);
    const roomProperty = await this.gameRepository.findRoomProperty(session.roomId, propertyId);

    if (!roomProperty || roomProperty.owner_id !== session.playerId) {
      throw new ForbiddenException('Player does not own this property');
    }

    if (roomProperty.type !== 'city' || !roomProperty.color_group || !roomProperty.house_price) {
      throw new ConflictException('Only city properties can be built on');
    }

    if (roomProperty.is_mortgaged) {
      throw new ConflictException('Mortgaged property cannot be built on');
    }

    const colorGroupTiles = await this.gameRepository.listPropertiesByColorGroup(roomProperty.color_group);
    const roomProperties = await this.gameRepository.listRoomProperties(session.roomId);
    const groupState = colorGroupTiles.map((tile) => {
      const state = roomProperties.find((property) => property.property_id === tile.id);
      return { tile, state };
    });
    const ownsSet = groupState.every((entry) => entry.state?.owner_id === session.playerId);

    if (!ownsSet) {
      throw new ConflictException('Player must own the full color set');
    }

    if (player.money < roomProperty.house_price) {
      throw new ConflictException('Not enough money to build');
    }

    const minHouses = Math.min(
      ...groupState.map((entry) =>
        entry.state?.hotel_count ? 5 : (entry.state?.house_count ?? 0),
      ),
    );
    const currentBuildLevel = roomProperty.hotel_count ? 5 : roomProperty.house_count;

    if (currentBuildLevel > minHouses || currentBuildLevel >= 5) {
      throw new ConflictException('Buildings must be added evenly across the color set');
    }

    const nextLevel = currentBuildLevel + 1;
    await this.gameRepository.buildOnProperty(
      session.roomId,
      propertyId,
      session.playerId,
      roomProperty.house_price,
      nextLevel === 5 ? 0 : nextLevel,
      nextLevel === 5 ? 1 : 0,
    );
    await this.gameRepository.appendLog(session.roomId, 'house_built', {
      player_id: session.playerId,
      property_id: propertyId,
      cost: roomProperty.house_price,
      level: nextLevel,
    });
    await this.stateStore.setGameplayState(session.roomId, { ...gameplay, phase: 'free_action' });

    return { state: await this.getRoomState(session.roomId) };
  }

  async mortgageProperty(
    session: SocketSession,
    propertyId: number,
  ): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'mortgage_property');
    const { gameplay } = await this.assertCurrentPlayer(session, [
      'await_action',
      'free_action',
      'bankruptcy_resolution',
    ]);
    const roomProperty = await this.gameRepository.findRoomProperty(session.roomId, propertyId);

    if (!roomProperty || roomProperty.owner_id !== session.playerId) {
      throw new ForbiddenException('Player does not own this property');
    }

    if (roomProperty.is_mortgaged || roomProperty.house_count > 0 || roomProperty.hotel_count > 0) {
      throw new ConflictException('Property cannot be mortgaged');
    }

    if (!roomProperty.mortgage_value) {
      throw new ConflictException('Property has no mortgage value');
    }

    await this.gameRepository.mortgageProperty(
      session.roomId,
      propertyId,
      session.playerId,
      roomProperty.mortgage_value,
    );
    await this.gameRepository.appendLog(session.roomId, 'property_mortgaged', {
      player_id: session.playerId,
      property_id: propertyId,
      amount: roomProperty.mortgage_value,
    });

    return { state: await this.resolveDebtAfterAssetAction(session.roomId, gameplay) };
  }

  async unmortgageProperty(
    session: SocketSession,
    propertyId: number,
  ): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'unmortgage_property');
    const { gameplay, player } = await this.assertCurrentPlayer(session, [
      'await_action',
      'free_action',
    ]);
    const roomProperty = await this.gameRepository.findRoomProperty(session.roomId, propertyId);

    if (!roomProperty || roomProperty.owner_id !== session.playerId) {
      throw new ForbiddenException('Player does not own this property');
    }

    if (!roomProperty.is_mortgaged || !roomProperty.mortgage_value) {
      throw new ConflictException('Property is not mortgaged');
    }

    const cost = Math.ceil(roomProperty.mortgage_value * 1.1);
    if (player.money < cost) {
      throw new ConflictException('Not enough money to unmortgage property');
    }

    await this.gameRepository.unmortgageProperty(session.roomId, propertyId, session.playerId, cost);
    await this.gameRepository.appendLog(session.roomId, 'property_unmortgaged', {
      player_id: session.playerId,
      property_id: propertyId,
      cost,
    });
    await this.stateStore.setGameplayState(session.roomId, { ...gameplay, phase: 'free_action' });

    return { state: await this.getRoomState(session.roomId) };
  }

  async payJailFine(session: SocketSession): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'pay_jail_fine');
    const { gameplay, player } = await this.assertCurrentPlayer(session, ['await_roll']);

    if (!gameplay.jailed_player_ids.includes(session.playerId)) {
      throw new ConflictException('Player is not in jail');
    }

    if (player.money < jailFine) {
      throw new ConflictException('Not enough money to pay jail fine');
    }

    await this.gameRepository.addPlayerMoney(session.playerId, -jailFine);
    await this.stateStore.setGameplayState(session.roomId, this.releaseFromJail(gameplay, session.playerId));
    await this.gameRepository.appendLog(session.roomId, 'jail_fine_paid', {
      player_id: session.playerId,
      amount: jailFine,
      reason: 'player_choice',
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async useJailCard(session: SocketSession): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'use_jail_card');
    const { gameplay } = await this.assertCurrentPlayer(session, ['await_roll']);

    if (!gameplay.jailed_player_ids.includes(session.playerId)) {
      throw new ConflictException('Player is not in jail');
    }

    if (!gameplay.jail_free_card_player_ids?.includes(session.playerId)) {
      throw new ConflictException('Player has no get out of jail card');
    }

    await this.stateStore.setGameplayState(session.roomId, {
      ...this.releaseFromJail(gameplay, session.playerId),
      jail_free_card_player_ids: this.removeOne(
        gameplay.jail_free_card_player_ids ?? [],
        session.playerId,
      ),
    });
    await this.gameRepository.appendLog(session.roomId, 'jail_card_used', {
      player_id: session.playerId,
    });

    return { state: await this.getRoomState(session.roomId) };
  }

  async sellBuilding(session: SocketSession, propertyId: number): Promise<{ state: RoomStatePayload }> {
    await this.assertSocketActionAllowed(session, 'sell_building');
    const { gameplay } = await this.assertCurrentPlayer(session, [
      'free_action',
      'bankruptcy_resolution',
    ]);
    const roomProperty = await this.gameRepository.findRoomProperty(session.roomId, propertyId);

    if (!roomProperty || roomProperty.owner_id !== session.playerId) {
      throw new ForbiddenException('Player does not own this property');
    }

    if (!roomProperty.house_price || (roomProperty.house_count === 0 && roomProperty.hotel_count === 0)) {
      throw new ConflictException('Property has no building to sell');
    }

    const refund = Math.floor(roomProperty.house_price / 2);
    const nextHotelCount = roomProperty.hotel_count > 0 ? 0 : roomProperty.hotel_count;
    const nextHouseCount =
      roomProperty.hotel_count > 0 ? 4 : Math.max(0, roomProperty.house_count - 1);

    await this.gameRepository.sellBuilding(
      session.roomId,
      propertyId,
      session.playerId,
      refund,
      nextHouseCount,
      nextHotelCount,
    );
    await this.gameRepository.appendLog(session.roomId, 'building_sold', {
      player_id: session.playerId,
      property_id: propertyId,
      refund,
    });

    return { state: await this.resolveDebtAfterAssetAction(session.roomId, gameplay) };
  }

  async declareBankruptcy(session: SocketSession): Promise<{
    bankrupt: PlayerBankruptPayload;
    finished: GameFinishedPayload | null;
    state: RoomStatePayload;
  }> {
    await this.assertSocketActionAllowed(session, 'declare_bankruptcy');
    const gameplay = await this.getGameplayStateOrThrow(session.roomId);
    const pending = gameplay.pending_action;

    if (
      !pending ||
      pending.type !== 'bankruptcy_resolution' ||
      pending.player_id !== session.playerId
    ) {
      throw new ConflictException('No bankruptcy resolution is pending');
    }

    if (await this.canStillCoverDebt(session.roomId, session.playerId, pending.amount)) {
      throw new ConflictException('Player still has assets to resolve the debt');
    }

    const result = await this.bankruptPlayer(session.roomId, session.playerId, pending.creditor_id);
    return {
      bankrupt: result.bankrupt,
      finished: result.finished,
      state: await this.getRoomState(session.roomId),
    };
  }

  async endTurn(session: SocketSession): Promise<{
    turnChanged: TurnChangedPayload;
    state: RoomStatePayload;
  }> {
    await this.assertSocketActionAllowed(session, 'end_turn');
    const { gameplay } = await this.assertCurrentPlayer(session, ['free_action']);
    const room = await this.roomsRepository.findById(session.roomId);
    const turnTimerSeconds = room?.turn_timer_seconds ?? 60;
    const players = await this.roomsRepository.listPlayers(session.roomId);
    const activePlayers = players
      .filter((player) => !player.is_bankrupt && player.turn_order !== null)
      .sort((left, right) => Number(left.turn_order) - Number(right.turn_order));

    if (activePlayers.length === 0) {
      throw new ConflictException('No active players remain');
    }

    const currentIndex = activePlayers.findIndex((player) => player.id === session.playerId);
    const shouldKeepTurn = gameplay.dice?.is_double && !gameplay.jailed_player_ids.includes(session.playerId);
    const nextPlayer = shouldKeepTurn
      ? activePlayers[currentIndex]
      : activePlayers[(currentIndex + 1) % activePlayers.length];
    const nextGameplay: GameplayState = {
      ...gameplay,
      current_player_id: nextPlayer.id,
      phase: 'await_roll',
      pending_action: null,
      double_count: shouldKeepTurn ? gameplay.double_count : 0,
      ...this.createTurnDeadline(turnTimerSeconds),
    };

    await this.stateStore.setGameplayState(session.roomId, nextGameplay);
    const turnChanged = { next_player_id: nextPlayer.id };
    await this.gameRepository.appendLog(session.roomId, 'turn_changed', turnChanged);

    return {
      turnChanged,
      state: await this.getRoomState(session.roomId),
    };
  }

  async getRoomState(
    roomId: string,
    knownPlayers?: RoomPlayerRecord[],
  ): Promise<RoomStatePayload> {
    await this.expireTurnIfOverdue(roomId);
    const room = await this.roomsRepository.findById(roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const players = knownPlayers ?? (await this.roomsRepository.listPlayers(roomId));
    const realtimePlayers = await Promise.all(
      players.map(async (player) => {
        const connection = await this.stateStore.getConnection(roomId, player.id);
        return {
          ...player,
          is_connected: connection.is_connected,
          disconnected_at: connection.disconnected_at,
        } satisfies RealtimePlayer;
      }),
    );
    const currentTurnPlayer =
      (await this.stateStore.getGameplayState(roomId))?.current_player_id ??
      realtimePlayers
        .filter((player) => player.turn_order !== null)
        .sort((left, right) => Number(left.turn_order) - Number(right.turn_order))[0]?.id ??
      null;
    const gameplay = await this.stateStore.getGameplayState(roomId);
    const roomProperties = await this.gameRepository.listRoomProperties(roomId);
    const gameLogs = await this.gameRepository.listLogs(roomId);

    return {
      room_id: room.id,
      room_code: room.room_code,
      room_name: room.room_name,
      status: room.status,
      visibility: room.visibility,
      max_players: room.max_players,
      starting_money: room.starting_money,
      turn_timer_seconds: room.turn_timer_seconds,
      state_version: await this.stateStore.getStateVersion(roomId),
      players: realtimePlayers.map((player) => ({
        ...player,
        is_in_jail: gameplay?.jailed_player_ids.includes(player.id) ?? false,
        jail_turns: gameplay?.jail_turns_by_player_id?.[player.id] ?? 0,
        get_out_of_jail_cards: gameplay?.jail_free_card_player_ids?.filter((id) => id === player.id).length ?? 0,
      })),
      current_turn_player_id: currentTurnPlayer,
      properties: roomProperties,
      turn: {
        current_player_id: gameplay?.current_player_id ?? currentTurnPlayer,
        phase: gameplay?.phase ?? (room.status === 'playing' ? 'await_roll' : 'waiting'),
        double_count: gameplay?.double_count ?? 0,
        deadline_at: gameplay?.turn_deadline_at ?? null,
      },
      dice: gameplay?.dice ?? null,
      pending_action: gameplay?.pending_action ?? null,
      winner_id: gameplay?.winner_id ?? null,
      last_card: gameplay?.last_card ?? null,
      game_logs: gameLogs.map((log) => ({
        event_type: log.event_type,
        payload: log.payload,
        created_at: log.created_at.toISOString(),
      })),
    };
  }

  async expireTurnIfOverdue(roomId: string): Promise<TurnChangedPayload | null> {
    const gameplay = await this.stateStore.getGameplayState(roomId);

    if (!gameplay || !gameplay.turn_deadline_at || gameplay.phase === 'finished') {
      return null;
    }

    if (Date.parse(gameplay.turn_deadline_at) > Date.now()) {
      return null;
    }

    const hasLock = await this.stateStore.acquireTurnTimerLock(roomId, this.timerLockOwner);

    if (!hasLock) {
      return null;
    }

    const lockedGameplay = await this.stateStore.getGameplayState(roomId);

    if (
      !lockedGameplay ||
      !lockedGameplay.turn_deadline_at ||
      lockedGameplay.phase === 'finished' ||
      Date.parse(lockedGameplay.turn_deadline_at) > Date.now()
    ) {
      return null;
    }

    return this.skipCurrentTurn(roomId, lockedGameplay, 'turn_timer_expired');
  }

  async listActiveTurnTimers(): Promise<Array<{
    roomId: string;
    deadlineAt: string;
    phase: GameplayState['phase'];
  }>> {
    const roomIds = new Set([
      ...(await this.stateStore.listGameplayRoomIds()),
      ...(await this.roomsRepository.listPlayingRoomIds()),
    ]);
    const timers: Array<{
      roomId: string;
      deadlineAt: string;
      phase: GameplayState['phase'];
    }> = [];

    for (const roomId of roomIds) {
      const room = await this.roomsRepository.findById(roomId);
      const gameplay = await this.stateStore.getGameplayState(roomId);

      if (
        room?.status === 'playing' &&
        gameplay?.turn_deadline_at &&
        gameplay.phase !== 'finished'
      ) {
        timers.push({
          roomId,
          deadlineAt: gameplay.turn_deadline_at,
          phase: gameplay.phase,
        });
      }
    }

    return timers;
  }

  private async assertSocketActionAllowed(
    session: SocketSession,
    action: string,
  ): Promise<void> {
    const isAllowed = await this.stateStore.assertActionAllowed(
      session.roomId,
      session.playerId,
      action,
    );

    if (!isAllowed) {
      throw new HttpException('Socket action rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private rollTwoDice(): NonNullable<GameplayState['dice']> {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;

    return {
      dice_1: dice1,
      dice_2: dice2,
      total: dice1 + dice2,
      is_double: dice1 === dice2,
      rolled_at: new Date().toISOString(),
    };
  }

  private emptyDice(playerId: string): DiceRolledPayload {
    return {
      player_id: playerId,
      dice_1: 0,
      dice_2: 0,
      total: 0,
      is_double: false,
    };
  }

  private async getGameplayStateOrThrow(roomId: string): Promise<GameplayState> {
    const gameplay = await this.stateStore.getGameplayState(roomId);

    if (!gameplay) {
      throw new ConflictException('Gameplay state is not initialized');
    }

    return gameplay;
  }

  private async assertCurrentPlayer(
    session: SocketSession,
    allowedPhases: GameplayState['phase'][],
  ): Promise<{ gameplay: GameplayState; player: RoomPlayerRecord }> {
    await this.expireTurnIfOverdue(session.roomId);
    const room = await this.roomsRepository.findById(session.roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== 'playing') {
      throw new ConflictException('Game is not playing');
    }

    const gameplay = await this.getGameplayStateOrThrow(session.roomId);

    if (gameplay.current_player_id !== session.playerId) {
      throw new ForbiddenException('It is not this player turn');
    }

    if (!allowedPhases.includes(gameplay.phase)) {
      throw new ConflictException(`Action is not allowed during ${gameplay.phase}`);
    }

    const player = await this.roomsRepository.findPlayerInRoom(session.roomId, session.playerId);

    if (!player || player.is_bankrupt) {
      throw new ForbiddenException('Player is not active in this game');
    }

    return { gameplay, player };
  }

  private async resolveTile(
    roomId: string,
    playerId: string,
    position: number,
    doubleCount: number,
    dice: NonNullable<GameplayState['dice']>,
  ): Promise<{
    gameplay: GameplayState;
    rentPaid: RentPaidPayload | null;
    bankrupt: PlayerBankruptPayload | null;
    finished: GameFinishedPayload | null;
  }> {
    const baseGameplay = await this.getGameplayStateOrThrow(roomId);
    const property = await this.gameRepository.findProperty(position);
    let nextGameplay: GameplayState = {
      ...baseGameplay,
      phase: 'free_action',
      double_count: doubleCount,
      dice,
      pending_action: null,
    };

    if (!property) {
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
    }

    if (position === goToJailPosition) {
      await this.gameRepository.updatePlayerPosition(playerId, jailPosition);
      await this.gameRepository.appendLog(roomId, 'sent_to_jail', {
        player_id: playerId,
        reason: 'go_to_jail_tile',
      });
      nextGameplay = {
        ...nextGameplay,
        double_count: 0,
        jailed_player_ids: this.addUnique(nextGameplay.jailed_player_ids, playerId),
      };
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
    }

    if (property.type === 'tax') {
      const amount = taxAmounts.get(position) ?? 0;
      const payer = await this.roomsRepository.findPlayerInRoom(roomId, playerId);

      if (payer && payer.money < amount) {
        const bankruptcy = await this.bankruptPlayer(roomId, playerId, null);
        return { gameplay: await this.getGameplayStateOrThrow(roomId), rentPaid: null, ...bankruptcy };
      }

      await this.gameRepository.addPlayerMoney(playerId, -amount);
      await this.gameRepository.appendLog(roomId, 'tax_paid', { player_id: playerId, amount });
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
    }

    if (property.type === 'chance' || property.type === 'community_chest') {
      const cardResult = await this.drawAndApplyCard(
        roomId,
        playerId,
        property.type,
        nextGameplay,
      );

      return {
        gameplay: cardResult.gameplay,
        rentPaid: null,
        bankrupt: cardResult.bankrupt,
        finished: cardResult.finished,
      };
    }

    if (!property.price) {
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
    }

    const roomProperty = await this.gameRepository.findRoomProperty(roomId, position);

    if (!roomProperty) {
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
    }

    if (!roomProperty.owner_id) {
      const pending: PendingAction = {
        type: 'buy_property',
        player_id: playerId,
        property_id: position,
        price: property.price,
      };
      return {
        gameplay: { ...nextGameplay, phase: 'await_action', pending_action: pending },
        rentPaid: null,
        bankrupt: null,
        finished: null,
      };
    }

    if (roomProperty.owner_id === playerId || roomProperty.is_mortgaged) {
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
    }

    const rent = this.calculateRent(roomProperty);
    const payer = await this.roomsRepository.findPlayerInRoom(roomId, playerId);

    if (payer && payer.money < rent) {
      const pending: PendingAction = {
        type: 'bankruptcy_resolution',
        player_id: playerId,
        creditor_id: roomProperty.owner_id,
        amount: rent,
        reason: 'rent',
      };
      return {
        gameplay: { ...nextGameplay, phase: 'bankruptcy_resolution', pending_action: pending },
        rentPaid: null,
        bankrupt: null,
        finished: null,
      };
    }

    await this.gameRepository.transferMoney(playerId, roomProperty.owner_id, rent);
    const rentPaid = {
      payer_id: playerId,
      owner_id: roomProperty.owner_id,
      property_id: position,
      amount: rent,
    };
    await this.gameRepository.appendLog(roomId, 'rent_paid', rentPaid);

    return { gameplay: nextGameplay, rentPaid, bankrupt: null, finished: null };
  }

  private calculateRent(property: { base_rent: number | null; house_count: number; hotel_count: number; rent_1_house: number | null; rent_2_house: number | null; rent_3_house: number | null; rent_4_house: number | null; rent_hotel: number | null; }): number {
    if (property.hotel_count > 0) {
      return property.rent_hotel ?? property.base_rent ?? 0;
    }

    if (property.house_count === 4) return property.rent_4_house ?? property.base_rent ?? 0;
    if (property.house_count === 3) return property.rent_3_house ?? property.base_rent ?? 0;
    if (property.house_count === 2) return property.rent_2_house ?? property.base_rent ?? 0;
    if (property.house_count === 1) return property.rent_1_house ?? property.base_rent ?? 0;

    return property.base_rent ?? 0;
  }

  private async resolveDebtAfterAssetAction(
    roomId: string,
    gameplay: GameplayState,
  ): Promise<RoomStatePayload> {
    const pending = gameplay.pending_action;

    if (!pending || pending.type !== 'bankruptcy_resolution') {
      await this.stateStore.setGameplayState(roomId, gameplay);
      return this.getRoomState(roomId);
    }

    const player = await this.roomsRepository.findPlayerInRoom(roomId, pending.player_id);

    if (player && player.money >= pending.amount) {
      if (pending.creditor_id) {
        await this.gameRepository.transferMoney(pending.player_id, pending.creditor_id, pending.amount);
        await this.gameRepository.appendLog(roomId, 'rent_paid', {
          payer_id: pending.player_id,
          owner_id: pending.creditor_id,
          amount: pending.amount,
          reason: pending.reason,
        });
      } else {
        await this.gameRepository.addPlayerMoney(pending.player_id, -pending.amount);
      }

      await this.stateStore.setGameplayState(roomId, {
        ...gameplay,
        phase: 'free_action',
        pending_action: null,
      });
      return this.getRoomState(roomId);
    }

    await this.stateStore.setGameplayState(roomId, gameplay);
    return this.getRoomState(roomId);
  }

  private async bankruptPlayer(
    roomId: string,
    playerId: string,
    creditorId: string | null,
  ): Promise<{ bankrupt: PlayerBankruptPayload; finished: GameFinishedPayload | null }> {
    await this.gameRepository.markPlayerBankrupt(playerId);
    await this.gameRepository.transferPlayerAssets(roomId, playerId, creditorId);
    const gameplay = await this.getGameplayStateOrThrow(roomId);
    const players = await this.roomsRepository.listPlayers(roomId);
    const activePlayers = players.filter((player) => !player.is_bankrupt && player.id !== playerId);
    const bankrupt = { player_id: playerId };

    await this.gameRepository.appendLog(roomId, 'player_bankrupt', bankrupt);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      const finished = {
        winner_id: winner.id,
        leaderboard: players
          .map((player) => ({
            player_id: player.id,
            player_name: player.player_name,
            money: player.id === playerId ? 0 : player.money,
            is_bankrupt: player.id === playerId ? true : player.is_bankrupt,
          }))
          .sort((left, right) => Number(left.is_bankrupt) - Number(right.is_bankrupt)),
      };
      await this.gameRepository.finishRoom(roomId);
      await this.gameRepository.appendLog(roomId, 'game_finished', finished);
      await this.stateStore.setGameplayState(roomId, {
        ...gameplay,
        phase: 'finished',
        winner_id: winner.id,
        pending_action: null,
      });
      return { bankrupt, finished };
    }

    const nextPlayer = activePlayers
      .filter((player) => player.turn_order !== null)
      .sort((left, right) => Number(left.turn_order) - Number(right.turn_order))[0] ?? null;
    await this.stateStore.setGameplayState(roomId, {
      ...gameplay,
      current_player_id: nextPlayer?.id ?? null,
      phase: 'await_roll',
      pending_action: null,
      double_count: 0,
      jailed_player_ids: gameplay.jailed_player_ids.filter((id) => id !== playerId),
      ...(nextPlayer ? this.createTurnDeadline(60) : {
        turn_deadline_at: null,
        turn_started_at: null,
      }),
    });

    return { bankrupt, finished: null };
  }

  private async assertHost(
    session: SocketSession,
    allowedStatuses: Array<'waiting' | 'playing' | 'finished'>,
  ): Promise<void> {
    const room = await this.roomsRepository.findById(session.roomId);

    if (!room || !allowedStatuses.includes(room.status)) {
      throw new ConflictException('Host action is not allowed in this room state');
    }

    const player = await this.roomsRepository.findPlayerInRoom(session.roomId, session.playerId);

    if (!player?.is_host) {
      throw new ForbiddenException('Only host can perform this action');
    }
  }

  private releaseFromJail(gameplay: GameplayState, playerId: string): GameplayState {
    const jailTurns = { ...(gameplay.jail_turns_by_player_id ?? {}) };
    delete jailTurns[playerId];

    return {
      ...gameplay,
      jailed_player_ids: gameplay.jailed_player_ids.filter((id) => id !== playerId),
      jail_turns_by_player_id: jailTurns,
      pending_action: null,
    };
  }

  private removeOne(values: string[], value: string): string[] {
    const index = values.indexOf(value);

    if (index < 0) {
      return values;
    }

    return [...values.slice(0, index), ...values.slice(index + 1)];
  }

  private async drawAndApplyCard(
    roomId: string,
    playerId: string,
    deck: 'chance' | 'community_chest',
    gameplay: GameplayState,
  ): Promise<{
    gameplay: GameplayState;
    bankrupt: PlayerBankruptPayload | null;
    finished: GameFinishedPayload | null;
  }> {
    const definitions = deck === 'chance' ? chanceCards : communityChestCards;
    const deckKey = deck === 'chance' ? 'chance_deck' : 'community_chest_deck';
    const currentDeck = gameplay[deckKey]?.length
      ? gameplay[deckKey]!
      : definitions.map((card) => card.card_id);
    const [cardId, ...restDeck] = currentDeck;
    const card = definitions.find((item) => item.card_id === cardId) ?? definitions[0];
    const nextDeck = [...restDeck, card.card_id];
    let nextGameplay: GameplayState = {
      ...gameplay,
      [deckKey]: nextDeck,
      last_card: {
        deck: card.deck,
        card_id: card.card_id,
        title: card.title,
        description: card.description,
      },
    };

    await this.gameRepository.appendLog(roomId, `${deck}_card`, {
      player_id: playerId,
      card_id: card.card_id,
      title: card.title,
      effect: card.effect.type,
    });

    if (card.effect.type === 'receive_money') {
      await this.gameRepository.addPlayerMoney(playerId, card.effect.amount);
      return { gameplay: nextGameplay, bankrupt: null, finished: null };
    }

    if (card.effect.type === 'pay_money') {
      const player = await this.roomsRepository.findPlayerInRoom(roomId, playerId);

      if (player && player.money < card.effect.amount) {
        const pending: PendingAction = {
          type: 'bankruptcy_resolution',
          player_id: playerId,
          creditor_id: null,
          amount: card.effect.amount,
          reason: 'card',
        };

        return {
          gameplay: { ...nextGameplay, phase: 'bankruptcy_resolution', pending_action: pending },
          bankrupt: null,
          finished: null,
        };
      }

      await this.gameRepository.addPlayerMoney(playerId, -card.effect.amount);
      return { gameplay: nextGameplay, bankrupt: null, finished: null };
    }

    if (card.effect.type === 'move_to') {
      const player = await this.roomsRepository.findPlayerInRoom(roomId, playerId);
      if (player && card.effect.position < player.position) {
        await this.gameRepository.addPlayerMoney(playerId, startBonus);
        await this.gameRepository.appendLog(roomId, 'start_bonus', {
          player_id: playerId,
          amount: startBonus,
          reason: 'card_move',
        });
      }
      await this.gameRepository.updatePlayerPosition(playerId, card.effect.position);
      return { gameplay: nextGameplay, bankrupt: null, finished: null };
    }

    if (card.effect.type === 'move_steps') {
      const player = await this.roomsRepository.findPlayerInRoom(roomId, playerId);
      const nextPosition = (((player?.position ?? 0) + card.effect.steps) % boardSize + boardSize) % boardSize;
      if (player && card.effect.steps > 0 && player.position + card.effect.steps >= boardSize) {
        await this.gameRepository.addPlayerMoney(playerId, startBonus);
        await this.gameRepository.appendLog(roomId, 'start_bonus', {
          player_id: playerId,
          amount: startBonus,
          reason: 'card_move',
        });
      }
      await this.gameRepository.updatePlayerPosition(playerId, nextPosition);
      return { gameplay: nextGameplay, bankrupt: null, finished: null };
    }

    if (card.effect.type === 'go_to_jail') {
      await this.gameRepository.updatePlayerPosition(playerId, jailPosition);
      nextGameplay = {
        ...nextGameplay,
        double_count: 0,
        jailed_player_ids: this.addUnique(nextGameplay.jailed_player_ids, playerId),
      };
      return { gameplay: nextGameplay, bankrupt: null, finished: null };
    }

    nextGameplay = {
      ...nextGameplay,
      jail_free_card_player_ids: [
        ...(nextGameplay.jail_free_card_player_ids ?? []),
        playerId,
      ],
    };

    return { gameplay: nextGameplay, bankrupt: null, finished: null };
  }

  private async canStillCoverDebt(roomId: string, playerId: string, debtAmount: number): Promise<boolean> {
    const player = await this.roomsRepository.findPlayerInRoom(roomId, playerId);
    const properties = await this.gameRepository.listRoomProperties(roomId);
    let liquidationValue = player?.money ?? 0;

    for (const property of properties.filter((item) => item.owner_id === playerId)) {
      const detail = await this.gameRepository.findRoomProperty(roomId, property.property_id);

      if (!detail) {
        continue;
      }

      if (!property.is_mortgaged && property.house_count === 0 && property.hotel_count === 0) {
        liquidationValue += detail.mortgage_value ?? 0;
      }

      if (detail.house_price) {
        liquidationValue += Math.floor(detail.house_price / 2) * property.house_count;
        liquidationValue += Math.floor(detail.house_price / 2) * property.hotel_count;
      }
    }

    return liquidationValue >= debtAmount;
  }

  private async buildLeaderboard(
    roomId: string,
    players: RoomPlayerRecord[],
  ): Promise<GameFinishedPayload['leaderboard']> {
    const roomProperties = await this.gameRepository.listRoomProperties(roomId);

    return Promise.all(
      players.map(async (player) => {
        let assetValue = player.money;

        for (const property of roomProperties.filter((item) => item.owner_id === player.id)) {
          const detail = await this.gameRepository.findRoomProperty(roomId, property.property_id);
          assetValue += detail?.mortgage_value ?? 0;
          assetValue += (detail?.house_price ?? 0) * (property.house_count + property.hotel_count);
        }

        return {
          player_id: player.id,
          player_name: player.player_name,
          money: assetValue,
          is_bankrupt: player.is_bankrupt,
        };
      }),
    ).then((leaderboard) => leaderboard.sort((left, right) => right.money - left.money));
  }

  private addUnique(values: string[], nextValue: string): string[] {
    return values.includes(nextValue) ? values : [...values, nextValue];
  }

  private async skipTurnIfCurrentPlayerUnavailable(
    roomId: string,
    playerId: string,
    reason: string,
  ): Promise<TurnChangedPayload | null> {
    const gameplay = await this.stateStore.getGameplayState(roomId);

    if (!gameplay || gameplay.current_player_id !== playerId || gameplay.phase === 'finished') {
      return null;
    }

    return this.skipCurrentTurn(roomId, gameplay, reason);
  }

  private async skipCurrentTurn(
    roomId: string,
    gameplay: GameplayState,
    reason: string,
  ): Promise<TurnChangedPayload | null> {
    if (gameplay.phase === 'bankruptcy_resolution') {
      return null;
    }

    const room = await this.roomsRepository.findById(roomId);
    const players = await this.roomsRepository.listPlayers(roomId);
    const activePlayers = players
      .filter((player) => !player.is_bankrupt && player.turn_order !== null)
      .sort((left, right) => Number(left.turn_order) - Number(right.turn_order));

    if (room?.status !== 'playing' || activePlayers.length === 0 || !gameplay.current_player_id) {
      return null;
    }

    const currentIndex = activePlayers.findIndex(
      (player) => player.id === gameplay.current_player_id,
    );
    const nextPlayer = activePlayers[(currentIndex + 1 + activePlayers.length) % activePlayers.length];
    const nextGameplay: GameplayState = {
      ...gameplay,
      current_player_id: nextPlayer.id,
      phase: 'await_roll',
      pending_action: null,
      double_count: 0,
      dice: null,
      ...this.createTurnDeadline(room.turn_timer_seconds),
    };

    await this.stateStore.setGameplayState(roomId, nextGameplay);
    const turnChanged = { next_player_id: nextPlayer.id };
    await this.gameRepository.appendLog(roomId, 'turn_skipped', {
      ...turnChanged,
      previous_player_id: gameplay.current_player_id,
      reason,
    });

    return turnChanged;
  }

  private createTurnDeadline(turnTimerSeconds: number): {
    turn_started_at: string;
    turn_deadline_at: string;
  } {
    const startedAt = Date.now();

    return {
      turn_started_at: new Date(startedAt).toISOString(),
      turn_deadline_at: new Date(startedAt + turnTimerSeconds * 1000).toISOString(),
    };
  }

  private verifySessionToken(token: string, roomId: string, playerId: string): void {
    const [payload, signature] = token.split('.');

    if (!payload || !signature || !this.isValidSignature(payload, signature)) {
      throw new ForbiddenException('Invalid session token');
    }

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
      player_id?: string;
      room_id?: string;
    };

    if (parsed.room_id !== roomId || parsed.player_id !== playerId || !parsed.exp || parsed.exp < Date.now()) {
      throw new ForbiddenException('Invalid session token');
    }
  }

  private isValidSignature(payload: string, signature: string): boolean {
    const expected = createHmac('sha256', getSessionTokenSecret())
      .update(payload)
      .digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
