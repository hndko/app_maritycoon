export type PropertyType =
  | 'city'
  | 'station'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community_chest'
  | 'start'
  | 'jail'
  | 'parking';

export type BoardTileSeed = {
  id: number;
  name: string;
  type: PropertyType;
  colorGroup: string | null;
  price: number | null;
  baseRent: number | null;
  rent1House: number | null;
  rent2House: number | null;
  rent3House: number | null;
  rent4House: number | null;
  rentHotel: number | null;
  housePrice: number | null;
  mortgageValue: number | null;
};

function city(
  id: number,
  name: string,
  colorGroup: string,
  price: number,
  baseRent: number,
  housePrice: number,
): BoardTileSeed {
  return {
    id,
    name,
    type: 'city',
    colorGroup,
    price,
    baseRent,
    rent1House: baseRent * 5,
    rent2House: baseRent * 15,
    rent3House: baseRent * 45,
    rent4House: baseRent * 80,
    rentHotel: baseRent * 125,
    housePrice,
    mortgageValue: Math.floor(price / 2),
  };
}

function buyableSpecial(
  id: number,
  name: string,
  type: 'station' | 'utility',
  price: number,
  baseRent: number,
): BoardTileSeed {
  return {
    id,
    name,
    type,
    colorGroup: null,
    price,
    baseRent,
    rent1House: null,
    rent2House: null,
    rent3House: null,
    rent4House: null,
    rentHotel: null,
    housePrice: null,
    mortgageValue: Math.floor(price / 2),
  };
}

function nonBuyable(id: number, name: string, type: PropertyType): BoardTileSeed {
  return {
    id,
    name,
    type,
    colorGroup: null,
    price: null,
    baseRent: null,
    rent1House: null,
    rent2House: null,
    rent3House: null,
    rent4House: null,
    rentHotel: null,
    housePrice: null,
    mortgageValue: null,
  };
}

export const boardTileSeeds: readonly BoardTileSeed[] = [
  nonBuyable(0, 'START', 'start'),
  city(1, 'Serang', 'Brown', 600000, 20000, 500000),
  nonBuyable(2, 'Dana Umum', 'community_chest'),
  city(3, 'Cilegon', 'Brown', 600000, 40000, 500000),
  nonBuyable(4, 'Pajak Jalan', 'tax'),
  buyableSpecial(5, 'Pelabuhan Merak', 'station', 2000000, 250000),
  city(6, 'Bogor', 'Light Blue', 1000000, 60000, 500000),
  nonBuyable(7, 'Kesempatan', 'chance'),
  city(8, 'Depok', 'Light Blue', 1000000, 60000, 500000),
  city(9, 'Bekasi', 'Light Blue', 1200000, 80000, 500000),
  nonBuyable(10, 'Penjara', 'jail'),
  city(11, 'Bandung', 'Pink', 1400000, 100000, 1000000),
  buyableSpecial(12, 'Perusahaan Listrik', 'utility', 1500000, 100000),
  city(13, 'Tasikmalaya', 'Pink', 1400000, 100000, 1000000),
  city(14, 'Cirebon', 'Pink', 1600000, 120000, 1000000),
  buyableSpecial(15, 'Stasiun Gambir', 'station', 2000000, 250000),
  city(16, 'Semarang', 'Orange', 1800000, 140000, 1000000),
  nonBuyable(17, 'Dana Umum', 'community_chest'),
  city(18, 'Solo', 'Orange', 1800000, 140000, 1000000),
  city(19, 'Yogyakarta', 'Orange', 2000000, 160000, 1000000),
  nonBuyable(20, 'Bebas Parkir', 'parking'),
  city(21, 'Surabaya', 'Red', 2200000, 180000, 1500000),
  nonBuyable(22, 'Kesempatan', 'chance'),
  city(23, 'Malang', 'Red', 2200000, 180000, 1500000),
  city(24, 'Kediri', 'Red', 2400000, 200000, 1500000),
  buyableSpecial(25, 'Bandara Soekarno-Hatta', 'station', 2000000, 250000),
  city(26, 'Denpasar', 'Yellow', 2600000, 220000, 1500000),
  city(27, 'Mataram', 'Yellow', 2600000, 220000, 1500000),
  buyableSpecial(28, 'Perusahaan Air', 'utility', 1500000, 100000),
  city(29, 'Kupang', 'Yellow', 2800000, 240000, 1500000),
  nonBuyable(30, 'Masuk Penjara', 'jail'),
  city(31, 'Balikpapan', 'Green', 3000000, 260000, 2000000),
  city(32, 'Samarinda', 'Green', 3000000, 260000, 2000000),
  nonBuyable(33, 'Dana Umum', 'community_chest'),
  city(34, 'Banjarmasin', 'Green', 3200000, 280000, 2000000),
  buyableSpecial(35, 'Pelabuhan Tanjung Perak', 'station', 2000000, 250000),
  nonBuyable(36, 'Kesempatan', 'chance'),
  city(37, 'Jakarta', 'Dark Blue', 3500000, 350000, 2000000),
  nonBuyable(38, 'Pajak Barang Mewah', 'tax'),
  city(39, 'Batam', 'Dark Blue', 4000000, 500000, 2000000),
] as const;
