// Demo data. All churches, people and figures are made up.
// budget and contributions are whole dollars for the measuring year.

export const MEASURING_YEAR = 2025;

const C = (id, name, city, region, delegate, budget, contributions, opts = {}) => ({
  id,
  name,
  city,
  region,
  delegate,
  budget,
  contributions,
  budgetCertified: opts.certified ?? true,
  fullYearMember: opts.fullYear ?? true,
  credential: opts.credential,
  group: opts.group,
});

// The sample churches fall into four groups, chosen so the tutorial's stories
// play out clearly (weights in brackets):
//   large-low   large churches that give under 2% of their budget [1 each]
//   small-low   small churches that give under 2% [1 each]
//   mid         mid-size churches that give 2% to under 4% [2 or 3]
//   small-high  small churches that give 4% or more [4 each]
// The three large churches have the biggest budgets, but the fewest weighted votes.
export const GROUPS = {
  'large-low': 'Large churches giving under 2%',
  'small-low': 'Small churches giving under 2%',
  mid: 'Mid-size churches giving 2% to 4%',
  'small-high': 'Small churches giving 4% or more',
};

export function seedChurches() {
  const g = (group, credential) => ({ group, credential });
  return [
    C('c01', 'Grace Fellowship Church', 'Des Moines, IA', 'Midwest', 'Daniel Hart', 200000, 9000, g('small-high', '0000-0001')),
    C('c02', 'Covenant Presbyterian Church', 'Springfield, IL', 'Midwest', 'Robert Lin', 1800000, 27000, g('large-low', '0000-0002')),
    C('c03', 'Redeemer Church', 'Fort Wayne, IN', 'Midwest', 'Samuel Okafor', 220000, 9900, g('small-high', '0000-0003')),
    C('c04', 'Trinity Bible Church', 'Lansing, MI', 'Midwest', 'Mark Jensen', 250000, 3000, g('small-low', '0000-0004')),
    C('c05', 'Hope Community Church', 'Hartford, CT', 'Northeast', 'Peter Alvarez', 600000, 13200, g('mid', '0000-0005')),
    C('c06', 'Christ Church Albany', 'Albany, NY', 'Northeast', 'James Whitfield', 240000, 10800, g('small-high', '0000-0006')),
    C('c07', 'Providence Chapel', 'Providence, RI', 'Northeast', 'Thomas Reyes', 150000, 2700, g('small-low', '0000-0007')),
    C('c08', 'Emmanuel Church', 'Charlotte, NC', 'Southeast', 'Andrew Booker', 2400000, 24000, g('large-low', '0000-0008')),
    C('c09', 'Cornerstone Baptist Church', 'Greenville, SC', 'Southeast', 'Michael Grant', 500000, 13000, g('mid', '0000-0009')),
    C('c10', 'Calvary Church of Macon', 'Macon, GA', 'Southeast', 'David Price', 400000, 13600, g('mid', '0000-0010')),
    C('c11', 'Living Hope Church', 'Knoxville, TN', 'Southeast', 'Joshua Kim', 160000, 8000, g('small-high', '0000-0011')),
    C('c12', 'Faith Reformed Church', 'Tulsa, OK', 'Southwest', 'Stephen Carter', 1200000, 21600, g('large-low', '0000-0012')),
    C('c13', 'Sovereign Grace Church', 'Albuquerque, NM', 'Southwest', 'Paul Herrera', 300000, 4500, g('small-low', '0000-0013')),
    C('c14', 'Mesa Bible Fellowship', 'Mesa, AZ', 'Southwest', 'Nathan Brooks', 210000, 8400, g('small-high', '0000-0014')),
    C('c15', 'Harbor Church', 'Tacoma, WA', 'West', 'Aaron Fischer', 450000, 13950, g('mid', '0000-0015')),
    C('c16', 'Christ the King Church', 'Boise, ID', 'West', 'Luke Yamamoto', 180000, 9000, g('small-high', '0000-0016')),
    C('c17', 'New Life Fellowship', 'Fresno, CA', 'West', 'Caleb Morris', 180000, 2700, g('small-low', '0000-0017')),
  ];
}

export function seedBallots() {
  return [
    {
      id: 'b-demo-1',
      story: 'procedural',
      delegateChoice: 'yes',
      kind: 'motion',
      type: 'procedural',
      title: 'Adopt the agenda',
      description: 'Adopt the agenda for this National Business Meeting, as set by the President.',
      countRule: 'church',
      threshold: 'majority',
      region: null,
      status: 'open',
      options: [],
      votes: {},
    },
    {
      id: 'b-demo-2',
      story: 'agree',
      delegateChoice: 'yes',
      kind: 'motion',
      type: 'budget',
      title: 'Approve next year\u2019s budget',
      description: 'Approve next year\u2019s budget of $1,240,000, as presented by the Board of Directors.',
      countRule: 'both',
      threshold: 'majority',
      region: null,
      status: 'draft',
      options: [],
      votes: {},
    },
  ];
}
