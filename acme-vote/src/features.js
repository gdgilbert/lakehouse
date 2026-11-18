// Feature switches for the demo.
// manager: show the Manager role on the opening screen. Off while the app is
// used as a delegate tutorial; set to true to bring the manager screens back.
export const FEATURES = {
  manager: false,
  // editTips: the artifact's owner can edit each tutorial tip's heading and
  // text on the card itself. Edits are saved in the artifact's database
  // (see src/tipStore.js). Turn off once the wording is final.
  editTips: true,
};
