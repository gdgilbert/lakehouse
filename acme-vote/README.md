# ACME Voting (demo)

A clickable mockup of a phone voting app for the National Business Meeting of the ACME Fellowship (Association of Churches for Missions and Evangelism). It was built to show the Bylaws Committee how the proposed voting rules, called Double Majority Voting, would work in practice.

This is a demo. It has no real security and no server. All data is stored in the browser that runs it.

## Running it

You need Node.js 18 or later.

```
cd acme-vote
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173). On a desktop the app is shown inside a phone frame. On a phone it fills the screen. `npm run dev` listens on your local network, so a phone on the same Wi-Fi can open the "Network" address it prints.

Other commands:

- `npm run build` builds a static copy into `acme-vote/demo/`. Those files can be served from any static host or folder; they use relative paths.
- `npm test` runs the tests for the voting rules (`src/server/rules.test.js`).

A built copy is committed in `acme-vote/demo/`, so the demo can be served without building it first.

## Using the demo

**The app currently runs as a tutorial.** The Manager role is hidden. The opening screen has one button, **Start the tutorial**, which signs you in as the delegate for Grace Fellowship Church and walks you through every kind of ballot. Tip cards appear at each step (**Got it** shrinks a card to a chip you can tap to reread it while you stay on that screen): first telling you what to do, then explaining how each ballot is counted, then explaining what just happened and why the rule is useful. Each tip appears once.

The guided tutorial follows a set path. After you vote, **See the result** fills in the other churches' votes so that each ballot shows a particular case:

1. Adopt the agenda (church count only): passes.
2. Approve next year's budget (both counts, Bylaws VIII §7): passes the church count but fails the weighted count.
3. Amend Article VIII, Section 1 (75% in both counts, XII §14): passes both.
4. President's third consecutive term (two-thirds in both counts, III §10(b)): a majority votes Yes but it falls short of two-thirds.
5. Judicial Commission slate (IV §2): passes.
6. At-Large Director, Seat 1 (III §3, VIII §6): no one elected on ballot 1, the runoff splits between the two counts, and ballot 3 is decided by combined score.

Elections come in the order set by Bylaws XII §15: the President, then the Judicial Commission, then the At-Large Directors. Only business of the National Business Meeting (VIII §4) appears; Regional elections such as Regional Director and Moderator happen at Regional Business Meetings and are not part of the tutorial.

The exact numbers vary from run to run, but each outcome is fixed. At the end, **Try it yourself** runs the same ballots again with a choice of result on each (**Demo pass** / **Demo fail**, or **Someone elected** / **No one elected**), and **Run the guided tutorial again** starts the path over. The **minimize** button (top right of a card) shrinks it to a small **Tip** chip where you tapped, so you can see the screen. Tap the chip to reopen the tip on the same page, or drag it anywhere; it comes back to the spot you dragged it to the next time you minimize a tip. **Hide tips** on any card turns them off; the **My church** tab can turn them back on or start the guided tutorial over.

If the page reloads (for example, when a new version is published or the phone reloads the tab), the app returns to the screen you were on.

**Editing the tips (temporary).** While `editTips` is on in `src/features.js`, the artifact's owner sees a pencil button on each tip card. It opens the card's heading and text for editing; **Save** keeps the new wording, **Use original** puts the original back, and edited pages show an **Edited** label. On the published page the edits are stored in the artifact's database (collection `tipEdits`, one document per tip page, with the original wording alongside), so they last across runs and devices and can be read back to make them permanent in `src/tutorial.js`. Only the owner can change them; anyone else the page is shared with sees the edited wording. Running locally, edits are kept in the browser instead. Some tips fill in numbers from each vote; an edit to one of those is saved as written, so the numbers in it stay fixed until the wording is made permanent.

All tutorial wording is in `src/tutorial.js`. To bring back the Manager role, set `manager: true` in `src/features.js`. The rest of this section describes both roles.

The opening screen asks you to choose a role: **Delegate** or **Manager**. This choice exists only for the demo.

**Manager**

- **Ballots tab:** create a motion (budget approval, amendment, or procedural motion), open voting, close voting, and see the result. While a ballot is open, the manager sees who has voted but not how. Results appear when voting closes.
- **Elections tab:** create an election, add nominees, and open ballots. The app works out what happens next after each ballot (elected, runoff, another ballot, or disqualification). This tab also runs the Judicial Commission election.
- **Churches tab:** the church registry. Each church shows its weighted votes and the reason for them. You can change a church's budget, contributions, certification and membership status to see how its weight changes.
- **Settings tab:** switch role, reset the demo data, and read a summary of the rules.
- **Demo: record votes for churches:** on an open ballot, the manager can record a vote for any church, or fill in the remaining churches at random. Use this to set up a specific result (for example, a split between the two counts) without signing in as each delegate.

**Delegate**

- Sign in with the church's delegate code. The sample churches use 0000-0001 through 0000-0017. Tap **Show demo codes** to see which code belongs to which church.
- The **Ballots** tab lists open ballots. Each ballot explains how the church's vote counts: on a church-count-only ballot, every church has a single vote whatever its weight; on a ballot that must pass both counts, the church casts 1 vote in the church count and its full weight in the weighted count. The delegate chooses one option (or abstains), reviews it, and submits. A vote cannot be changed after it is submitted. The app shows a receipt number.
- After voting, the demo-only buttons **Demo pass** and **Demo fail** (on an election, **Someone elected** and **No one elected**) fill in votes for the other churches and close the ballot, so a delegate can see a result without switching to the manager. The votes are random but steered to the chosen outcome. A failing two-count motion is set up, when possible, to pass the church count and fail the weighted count. A failing election is set up, when possible, as a split between the two counts. The manager has the same buttons on an open ballot.
- **Sample ballot sequence.** When a ballot closes, the demo opens the next sample ballot, each of a different kind, and a **Ballot open** bar appears at the top of every delegate screen until the church votes on it. The order is: adopt the agenda (procedural, church count only), approve the budget (both counts, majority), an amendment (both counts, 75%), a recess (procedural; Try it yourself only), a President's third consecutive term (two-thirds), the Judicial Commission slate (and, if it fails, the five seats one at a time), and an At-Large Director seat with three nominees. An undecided election goes straight to its next ballot: runoff, ballot 3, ballot 4. Turn this off in the manager's Settings tab.
- Every result has a **Charts and details** link (tapping the result cards also opens it), with four views: **Overview** (both counts against the threshold, and why they differ), **By weight** (how churches with 1, 2, 3 and 4 weighted votes voted), **By Region**, and **Churches** (every church's vote and weight).
- Whenever a ballot is open that the church has not voted on, a **Ballot open** bar sits under the header on every delegate screen (except that ballot's own screen); tapping it goes to the ballot. A finished ballot's result is shown in one box.
- The **Results** tab lists closed ballots and their results.
- The **My church** tab shows the church's weighted votes and the figures they are based on.

To show the manager and a delegate side by side, open the app in two browser tabs. Sign in as the manager in one and as a delegate in the other. Both tabs update when either one changes something.

To start over, use **Reset demo data** on the opening screen or in Settings.

## The voting rules: Double Majority Voting

### Two counts

Every vote is counted two ways.

1. **Church count.** Each Member Church that votes casts 1 vote.
2. **Weighted count.** Each Member Church casts 1 to 4 votes. The number depends on the church's contributions to ACME during the measuring year, as a percentage of the church's adopted annual budget:

   | Contributions as a share of budget | Votes |
   |---|---|
   | Less than 2% | 1 |
   | At least 2% but less than 3% | 2 |
   | At least 3% but less than 4% | 3 |
   | 4% or more | 4 |

   A church gets 1 vote, whatever it contributed, if its elders have not certified its budget, or if it was not a member for the whole measuring year.

A church casts all of its votes the same way. Each church has one voting delegate, who casts all of the church's votes.

### Which count decides

This is set on each ballot. The defaults are:

- **Elections, budget approval, and amendments** must pass both counts.
- **Procedural motions** (adjourn, set the agenda, and similar) are decided by the church count only. The app does not show a weighted count for these ballots.

### How many votes are needed

This is also set on each ballot. The defaults are:

- **Majority of votes cast** (more than half): elections, budget approval, procedural motions.
- **75% of votes cast:** amendments.
- **Two-thirds of votes cast:** available for special cases, such as electing a President to a third consecutive term.

Abstentions are not votes cast. A church that abstains is left out of both counts.

### Elections

The draft Bylaws (VIII §6, IV §2) elect a candidate by a majority of the votes cast and, if no one has a majority, hold a runoff between the two candidates who received the most votes. Under Double Majority Voting the app applies that process to both counts, and adds third and fourth ballots for a runoff that splits, which the draft does not address:

- A candidate is elected by a majority of the votes cast in both counts.
- **Ballot 1:** if no candidate carries both counts, ballot 2 is a runoff between the two candidates with the highest combined scores ("the most votes" under two counts).
- **Ballot 2 (runoff):** a candidate must still carry both counts. If the runoff splits, a third ballot is taken.
- **Ballot 3** is different, and the app says so on the ballot: it is final unless the combined scores tie exactly. If one candidate carries both counts, that candidate is elected. If the result splits (one candidate wins the church count and the other wins the weighted count), the candidate with the higher combined score is elected.
- **Combined score** = the candidate's percentage of the church count + the candidate's percentage of the weighted count. For example, 47.1% of the church count and 68.3% of the weighted count gives a combined score of 115.4.
- **Ballot 4** is the final ballot, and the app says so on the ballot: it is scored the same way as ballot 3. If the combined scores tie again, both candidates are disqualified and nominations are reopened. Voting then starts again from ballot 1. A disqualified candidate cannot be nominated again in that election.

### Judicial Commission

1. The National Business Meeting first votes on the President's five nominees as a single slate. The slate needs a majority in both counts.
2. If the slate passes, all five are elected.
3. If the slate fails, the five seats are filled one at a time. For each seat, any delegate may nominate a man from the floor, including any of the President's nominees. Each seat is decided by the election rules above before the next seat opens. A person already elected to a seat cannot be nominated for another.

### Regional ballots

Regional elections belong to Regional Business Meetings (Bylaws VIII §2, §5), so the tutorial has none. The manager screens can still limit a ballot or election to the churches of one Region. Only churches in that Region can vote on it, and both counts include only those churches. The demo uses five Regions: Midwest, Northeast, Southeast, Southwest, and West.

## Decisions made where the rules were silent

These choices are made in the demo and should be checked by the committee:

- **Double Majority Voting is not yet in the draft Bylaws.** The draft of November 17, 2026 still gives each Member Church one vote at the National Business Meeting (VIII §3). The app follows the draft's procedures (offices, order of business, thresholds, runoff) and applies the double count to them.
- **Split runoff.** The draft's runoff assumes one count. A runoff that splits between the counts goes to a third ballot, as described under Elections.
- **Tie for second place on ballot 1.** If two or more candidates tie for second place by combined score, all of them go on to ballot 2.
- **No votes cast.** If an election ballot closes with no votes cast, the same ballot is taken again. A motion with no votes cast fails.
- **When a church's weight is fixed.** A church's weight is recorded when it votes. If the registry changes afterward, votes already cast keep their original weight.
- **Exact thresholds.** "Majority" means more than half. "Two-thirds" and "75%" mean at least that share. A vote at exactly 50% is not a majority.
- **One nominee.** An election can proceed with a single nominee. Because abstentions are not votes cast, a single nominee is elected if at least one church votes for that person. The committee may want a different rule for unopposed elections.
- **Delegates cannot change a submitted vote.**

## How the code is organized

```
acme-vote/
  index.html
  src/
    server/            Everything a real server would do
      rules.js         The voting rules: weights, tallies, pass/fail, election rounds (pure functions)
      rules.test.js    Tests for rules.js
      seed.js          Sample churches and ballots
      api.js           Church registry, delegate codes, ballots, vote storage, elections,
                       Judicial Commission. Saves to localStorage.
    screens/           Start, Delegate and Manager screens
    components.jsx     Shared UI pieces and the result displays
    styles.css         Colors, fonts and layout (design tokens at the top)
```

The screens talk only to `src/server/api.js`, and every function in it returns a Promise. To connect a real server, replace the bodies of those functions with HTTP calls and keep the same names and return shapes. `rules.js` has no browser dependencies and could run unchanged on the server.

## Styling

The styling follows the ACME website (acmefellowship.org). The site could not be fetched from the environment this demo was built in, so the match was made from screenshots of the site:

- Near-black (#0f141d) and deep navy (#1b2335) for the header and opening screen; a light background for ballots and results so they are easy to read.
- Muted gold (#c19a3f) for main buttons, short divider rules and spaced uppercase labels.
- An italic serif for headings (Newsreader) and a light geometric sans for text (Outfit), both from Google Fonts. These are close matches, not necessarily the site's exact fonts.
- Square buttons with uppercase, letter-spaced text.
- The "ACME / Fellowship of Churches" wordmark set in type. Swap in the real logo file in the `Logo` component in `src/components.jsx` if one is available.

All colors and fonts are variables at the top of `src/styles.css`.

All names, churches, and figures in the demo are made up.
