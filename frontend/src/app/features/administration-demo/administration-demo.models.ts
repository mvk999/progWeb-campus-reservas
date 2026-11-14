export interface AdministrationEnvironment {
  readonly code: string;
  readonly name: string;
  readonly location: string;
  readonly responsible: string;
}

export interface AdministrationMenuItem {
  readonly label: string;
  readonly available: boolean;
}
