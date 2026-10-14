## MODIFIED Requirements

### Requirement: Detected direction is displayed

A shown translation SHALL display its direction as the source and target pair members' uppercased primary subtags joined by `→`. The full language names SHALL be its accessible label and tooltip. Only the configured pair members are displayed, never the model's raw detected tag. The one exception is the R'lyehian easter-egg reply, whose direction is defined by the presentation capability.

#### Scenario: Direction of a Polish input

- **WHEN** `kawa` is translated with the pair `pl` / `en`
- **THEN** the result shows the direction `PL → EN`
- **AND** its accessible label reads `Polish → English`

#### Scenario: Regional pair member shows its primary subtag

- **WHEN** a translation's source is the pair member `pl-PL`
- **THEN** the direction shows `PL` for the source
- **AND** the accessible label names it `Polish (Poland)`

#### Scenario: Easter-egg reply names a language outside the pair

- **WHEN** the R'lyehian chant is submitted with the pair `pl` / `en`
- **THEN** the direction shows `R'LYEHIAN → EN`, although R'lyehian is not a pair member
