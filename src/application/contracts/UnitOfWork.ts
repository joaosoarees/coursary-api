export interface UnitOfWork {
  add: (...operations: UnitOfWork.Operation[]) => void;

  commit: () => Promise<void>;
}

export namespace UnitOfWork {
  // Built by a repository and read only by the unit of work of the same storage.
  export interface Operation {
    readonly __brand: 'UnitOfWork.Operation';
  }

  export type Factory = () => UnitOfWork;
}
