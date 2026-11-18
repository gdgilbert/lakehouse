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

**The app currently runs as a tutorial on Double Majority Voting.** The Manager role is hidden. The app is styled as a plain ACME delegate voting app; the first tip says it is a tutorial.

A **Full screen** button on the opening screen and the slideshow hides the browser's address bar. It appears only where the browser allows it (for example Chrome on Android and desktop browsers; Safari on iPhone does not allow it).

1. **Opening slideshow.** **Start the tutorial** plays a short slideshow using five of the sample churches. Each slide is a series of steps; **Next** adds one sentence at a time; the sentence appears first and its part of the animation follows about two and a half seconds later. The text never shifts the animation, and the replay button, which stays in one place, restarts the slide. The slides cover: their sizes, one church, one vote (a press crushes the larger churches, cracking them, down to the size of the smallest, then each gets one ballot), who gives the most (dollar bars that turn into share-of-budget bars, reversing the order), weighted votes by commitment (the gold share-of-budget bars break into pieces that become each church's weighted votes), counting both, animated examples of why either count alone can be unfair, and a double pass in which three very different churches (the two largest and the smallest, boxed in gold) together make a majority of both counts. **Skip** goes straight to the ballots.
2. **Ballots.** You sign in as the delegate for Grace Fellowship Church (a small church that gives 4.5% of its budget, so 4 weighted votes) and vote on five ballots. After each vote, **See the result** fills in the other churches' votes so each ballot tells a story:

   | Ballot | Story | Grace votes | Church count | Weighted | Double Majority Voting |
   |---|---|---|---|---|---|
   | Adopt the agenda | Procedural: one church, one vote | Yes | passes | | passes |
   | Approve next year's budget | When churches agree, nothing changes | Yes | passes | passes | passes |
   | Lease a downtown office | Size does not buy votes | No | fails | fails | fails |
   | Fund an advertising campaign | Churches at lower commitment levels cannot outvote churches at higher levels | No | passes | fails | fails |
   | Give the conference budget to missions | Churches at higher commitment levels cannot overrule everyone else | Yes | fails | passes | fails |

   In this first run-through the delegate is asked to vote as shown, so each ballot tells its story; tapping another answer does not select it; a short note asks for the needed vote and explains that Run it yourself is open afterward. Each two-count result has a **Counted different ways** card showing what one church, one vote and weighted votes alone would each decide next to Double Majority Voting, with a sentence on what the difference shows.
3. **End.** After the last ballot: **Finish** (a short closing slideshow: what you saw, big does not mean powerful, commitment is a choice, what happens if every church gives 4% or more (the weighted count becomes one church, one vote again), and a closing line), **Run it yourself** (the same ballots; vote however you like, and the other churches vote at random, so results differ each run), or **Start the tutorial again**.

The sample churches are grouped to make these stories clear (see `GROUPS` in `src/server/seed.js`); the votes for each story are set in `STORY_VOTES` in `src/server/api.js`.

Tip cards appear at each step (**Got it** shrinks a card to a chip you can tap to reread it while you stay on that screen). Each tip appears once. The **minimize** button shrinks a card to a chip where you tapped; tap the chip to reopen it, or drag it out of the way. An open tip card can be moved by dragging the grip bar along its top edge. **Hide tips** turns them off; the **My church** tab can turn them back on or start the tutorial over.

**To start everything over quickly,** double-tap the ACME logo (or the screen title in the header). That clears votes, results and tutorial progress and returns to the opening screen; edited tip wording is kept.

If the page reloads (for example, when a new version is published or the phone reloads the tab), the app returns to the screen you were on, and an open tip returns to the page you were reading.

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
- The **Ballots** tab lists open ballots. Each ballot explains how the church's vote counts: on a church-count-only ballot, every church has a single vote whatever its weight; on a ballot that must pass both counts, the church casts 1 vote in the church count and its full weight in the weighted count. The delegate chooses one option (or abstains), reviews it, and submits it by pressing and holding the submit button for two seconds (the button fills while held; letting go early cancels). A vote cannot be changed after it is submitted. The app shows a receipt number.
- After voting, **See the result** fills in the other churches' votes (set for each story in the guided tutorial, random in Run it yourself) and close the ballot, so a delegate sees a result without a manager. The Manager screens, when turned on, can record votes for any church.
- **Ballot sequence.** When a ballot closes, the next story ballot opens, and a **Ballot open** bar appears at the top of every delegate screen until the church votes on it.
- Every result has a **Charts and details** link with four views: **Overview** (both counts against the threshold, and why they differ), **Church** (the church count, including by Region), **Weighted** (the weighted count, how churches with 1, 2, 3 and 4 weighted votes voted, and by Region), and **Churches** (every church's vote and weight). Tapping the **Church count** or **Weighted count** card on a result opens that view directly. Church-count-only ballots have no Weighted view.
- Whenever a ballot is open that the church has not voted on, a **Ballot open** bar sits under the header on every delegate screen (except that ballot's own screen); tapping it goes to the ballot. A finished ballot's result is shown in one box.
- The bottom buttons (**Ballots**, **Results**, **My church**) stay on every delegate screen; **Ballots** is home, listing open ballots and then completed ones. Back goes up one level (stats to result, result to home) rather than retracing every screen visited.
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
