import * as migration_20261009_025625_initial from './20261009_025625_initial';
import * as migration_20261009_061826_core_schema from './20261009_061826_core_schema';
import * as migration_20261009_081822_wave2 from './20261009_081822_wave2';

export const migrations = [
  {
    up: migration_20261009_025625_initial.up,
    down: migration_20261009_025625_initial.down,
    name: '20261009_025625_initial',
  },
  {
    up: migration_20261009_061826_core_schema.up,
    down: migration_20261009_061826_core_schema.down,
    name: '20261009_061826_core_schema',
  },
  {
    up: migration_20261009_081822_wave2.up,
    down: migration_20261009_081822_wave2.down,
    name: '20261009_081822_wave2'
  },
];
