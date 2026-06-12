import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class RealtimeService {
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

    await this.stateStore.markConnected(input.room_id, input.player_id, socketId);
    return this.getRoomState(input.room_id);
  }

  async disconnect(socketId: string): Promise<SocketSession | null> {
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

    return {
      socketId,
      roomId: session.roomId,
      playerId: session.playerId,
      playerName: player?.player_name ?? 'Unknown Player',
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

  async startGame(session: SocketSession): Promise<{
    started: GameStartedPayload;
    state: RoomStatePayload;
  }> {
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
    const { gameplay, player } = await this.assertCurrentPlayer(session, ['await_roll']);
    let nextGameplay = gameplay;

    if (gameplay.jailed_player_ids.includes(session.playerId)) {
      if (player.money < jailFine) {
        const bankruptcy = await this.bankruptPlayer(session.roomId, session.playerId, null);
        return {
          diceRolled: this.emptyDice(session.playerId),
          moved: null,
          rentPaid: null,
          bankrupt: bankruptcy.bankrupt,
          finished: bankruptcy.finished,
          state: await this.getRoomState(session.roomId),
        };
      }

      await this.gameRepository.addPlayerMoney(session.playerId, -jailFine);
      nextGameplay = {
        ...gameplay,
        jailed_player_ids: gameplay.jailed_player_ids.filter((id) => id !== session.playerId),
      };
      await this.gameRepository.appendLog(session.roomId, 'jail_fine_paid', {
        player_id: session.playerId,
        amount: jailFine,
      });
    }

    const dice = this.rollTwoDice();
    const diceRolled: DiceRolledPayload = {
      player_id: session.playerId,
      dice_1: dice.dice_1,
      dice_2: dice.dice_2,
      total: dice.total,
      is_double: dice.is_double,
    };
    const nextDoubleCount = dice.is_double ? nextGameplay.double_count + 1 : 0;
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

  async declareBankruptcy(session: SocketSession): Promise<{
    bankrupt: PlayerBankruptPayload;
    finished: GameFinishedPayload | null;
    state: RoomStatePayload;
  }> {
    const gameplay = await this.getGameplayStateOrThrow(session.roomId);
    const pending = gameplay.pending_action;

    if (
      !pending ||
      pending.type !== 'bankruptcy_resolution' ||
      pending.player_id !== session.playerId
    ) {
      throw new ConflictException('No bankruptcy resolution is pending');
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
    const { gameplay } = await this.assertCurrentPlayer(session, ['free_action']);
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

    return {
      room_id: room.id,
      room_code: room.room_code,
      room_name: room.room_name,
      status: room.status,
      visibility: room.visibility,
      max_players: room.max_players,
      starting_money: room.starting_money,
      turn_timer_seconds: room.turn_timer_seconds,
      state_version: await this.stateStore.nextStateVersion(roomId),
      players: realtimePlayers.map((player) => ({
        ...player,
        is_in_jail: gameplay?.jailed_player_ids.includes(player.id) ?? false,
      })),
      current_turn_player_id: currentTurnPlayer,
      properties: roomProperties,
      turn: {
        current_player_id: gameplay?.current_player_id ?? currentTurnPlayer,
        phase: gameplay?.phase ?? (room.status === 'playing' ? 'await_roll' : 'waiting'),
        double_count: gameplay?.double_count ?? 0,
      },
      dice: gameplay?.dice ?? null,
      pending_action: gameplay?.pending_action ?? null,
      winner_id: gameplay?.winner_id ?? null,
    };
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
      const amount = property.type === 'chance' ? 500000 : 300000;
      await this.gameRepository.addPlayerMoney(playerId, amount);
      await this.gameRepository.appendLog(roomId, `${property.type}_card`, {
        player_id: playerId,
        effect: 'receive_money',
        amount,
      });
      return { gameplay: nextGameplay, rentPaid: null, bankrupt: null, finished: null };
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
    });

    return { bankrupt, finished: null };
  }

  private addUnique(values: string[], nextValue: string): string[] {
    return values.includes(nextValue) ? values : [...values, nextValue];
  }
}
