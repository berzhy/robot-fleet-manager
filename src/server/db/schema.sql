-- Full schema for an empty database. Delete the database file to apply a new copy.
CREATE TABLE robots (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  manufacturer text NOT NULL,
  type text NOT NULL,
  integration_type text NOT NULL,
  site text NOT NULL,
  created_at text NOT NULL,
  control_target text DEFAULT 'work' NOT NULL,
  control_revision integer DEFAULT 0 NOT NULL,
  CONSTRAINT control_target_value CHECK (control_target IN ('work', 'stop', 'base')),
  CONSTRAINT control_revision_range CHECK (control_revision >= 0),
  CONSTRAINT integration_type_value CHECK (integration_type IN ('ros2', 'vda5050', 'vendor-api')),
  CONSTRAINT robot_type_value CHECK (type IN ('cleaning', 'security', 'delivery', 'inspection'))
);

CREATE TABLE latest_telemetry (
  robot_id text PRIMARY KEY NOT NULL,
  activity text NOT NULL,
  battery_percent real,
  area text,
  problem_code text,
  applied_control_revision integer DEFAULT 0 NOT NULL,
  received_at text,
  observed_at text NOT NULL,
  FOREIGN KEY (robot_id) REFERENCES robots (id) ON DELETE CASCADE,
  CONSTRAINT problem_activity CHECK (
    (
      activity = 'needs-attention'
      AND problem_code IS NOT NULL
      AND problem_code IN ('path-blocked', 'position-lost', 'sensor-obstructed')
    )
    OR (activity != 'needs-attention' AND problem_code IS NULL)
  ),
  CONSTRAINT battery_range CHECK (battery_percent BETWEEN 0 AND 100),
  CONSTRAINT activity_value CHECK (
    activity IN (
      'working',
      'idle',
      'returning',
      'charging',
      'needs-attention',
      'unknown'
    )
  )
);
