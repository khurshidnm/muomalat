import * as migration_20261009_025625_initial from './20261009_025625_initial';

export const migrations = [
  {
    up: migration_20261009_025625_initial.up,
    down: migration_20261009_025625_initial.down,
    name: '20261009_025625_initial'
  },
];
