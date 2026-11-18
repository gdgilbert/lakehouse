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
});

export function seedChurches() {
  return [
    C('c01', 'Grace Fellowship Church', 'Des Moines, IA', 'Midwest', 'Daniel Hart', 420000, 18900, { credential: '0000-0001' }),
    C('c02', 'Covenant Presbyterian Church', 'Springfield, IL', 'Midwest', 'Robert Lin', 1250000, 21000, { credential: '0000-0002' }),
    C('c03', 'Redeemer Church', 'Fort Wayne, IN', 'Midwest', 'Samuel Okafor', 310000, 7750, { credential: '0000-0003' }),
    C('c04', 'Trinity Bible Church', 'Lansing, MI', 'Midwest', 'Mark Jensen', 185000, 6500, { credential: '0000-0004' }),
    C('c05', 'Hope Community Church', 'Hartford, CT', 'Northeast', 'Peter Alvarez', 960000, 14400, { credential: '0000-0005' }),
    C('c06', 'Christ Church Albany', 'Albany, NY', 'Northeast', 'James Whitfield', 240000, 10800, { credential: '0000-0006' }),
    C('c07', 'Providence Chapel', 'Providence, RI', 'Northeast', 'Thomas Reyes', 150000, 3600, { credential: '0000-0007', certified: false }),
    C('c08', 'Emmanuel Church', 'Charlotte, NC', 'Southeast', 'Andrew Booker', 1800000, 45000, { credential: '0000-0008' }),
    C('c09', 'Cornerstone Baptist Church', 'Greenville, SC', 'Southeast', 'Michael Grant', 520000, 26000, { credential: '0000-0009' }),
    C('c10', 'Calvary Church of Macon', 'Macon, GA', 'Southeast', 'David Price', 275000, 6875, { credential: '0000-0010' }),
    C('c11', 'Living Hope Church', 'Knoxville, TN', 'Southeast', 'Joshua Kim', 135000, 7425, { credential: '0000-0011', fullYear: false }),
    C('c12', 'Faith Reformed Church', 'Tulsa, OK', 'Southwest', 'Stephen Carter', 690000, 24150, { credential: '0000-0012' }),
    C('c13', 'Sovereign Grace Church', 'Albuquerque, NM', 'Southwest', 'Paul Herrera', 380000, 5700, { credential: '0000-0013' }),
    C('c14', 'Mesa Bible Fellowship', 'Mesa, AZ', 'Southwest', 'Nathan Brooks', 210000, 8400, { credential: '0000-0014' }),
    C('c15', 'Harbor Church', 'Tacoma, WA', 'West', 'Aaron Fischer', 450000, 9900, { credential: '0000-0015' }),
    C('c16', 'Christ the King Church', 'Boise, ID', 'West', 'Luke Yamamoto', 330000, 15180, { credential: '0000-0016' }),
    C('c17', 'New Life Fellowship', 'Fresno, CA', 'West', 'Caleb Morris', 260000, 7020, { credential: '0000-0017' }),
  ];
}

export function seedBallots() {
  return [
    {
      id: 'b-demo-1',
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
