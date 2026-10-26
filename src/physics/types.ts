export type Vector2 = { x: number; y: number };

export type Body = {
  id: string;
  name: string;
  mass: number; // kg
  radius: number; // m, display/diagnostic parameter; not used as a collision radius
  position: Vector2; // m
  velocity: Vector2; // m/s
  color: string;
  trail: Vector2[];
  fixed?: boolean;
};

export type PhysicsConfig = {
  gravitationalConstant: number; // m^3 kg^-1 s^-2
  softening: number; // m
};
