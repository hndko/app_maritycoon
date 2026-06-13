import { PropertyTile, RealtimeRoomProperty, RoomPlayer } from '@/shared/api/types';
import { boardSize, getBoardTrack } from '@/shared/lib/board';
import { BoardTile } from './BoardTile';

export function GameBoard({
  onTileSelect,
  players,
  properties,
  roomProperties = [],
}: {
  onTileSelect?: (tile: PropertyTile) => void;
  players: RoomPlayer[];
  properties: PropertyTile[];
  roomProperties?: RealtimeRoomProperty[];
}) {
  const tileMap = new Map(properties.map((property) => [property.id, property]));
  const roomPropertyMap = new Map(
    roomProperties.map((property) => [property.property_id, property]),
  );

  return (
    <section className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-3">
      <div className="grid aspect-square min-w-[680px] grid-cols-11 grid-rows-11 gap-1">
        {Array.from({ length: boardSize }, (_, index) => {
          const tile = tileMap.get(index);

          if (!tile) {
            return null;
          }

          const track = getBoardTrack(index);
          return (
            <div
              key={tile.id}
              style={{
                gridColumn: track.gridColumn,
                gridRow: track.gridRow,
              }}
            >
              <BoardTile
                onSelect={onTileSelect}
                players={players.filter((player) => player.position === tile.id)}
                roomProperty={roomPropertyMap.get(tile.id)}
                tile={tile}
              />
            </div>
          );
        })}
        <div className="col-start-3 col-end-10 row-start-3 row-end-10 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold uppercase text-primary">MariTycoon</p>
          <h2 className="mt-2 text-3xl font-bold">Indonesia Board</h2>
          <p className="mt-3 max-w-sm text-sm text-slate-600">
            Papan 40 tile dengan kota, stasiun, kesempatan, pajak, dan titik awal.
          </p>
        </div>
      </div>
    </section>
  );
}
