export type Coordinates = {
  readonly latitude: number;
  readonly longitude: number;
};


export type Location = {
  readonly name: string;
  readonly region?: string;
  readonly country?: string;
  readonly coordinates: Coordinates;
};
