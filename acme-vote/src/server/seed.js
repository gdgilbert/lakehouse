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
    C('c01', 'Grace Fellowship Church', 'Des Moines, IA', 'Midwest', 'Daniel Hart', 420000, 18900, { credential: '4827-1934' }),
    C('c02', 'Covenant Presbyterian Church', 'Springfield, IL', 'Midwest', 'Robert Lin', 1250000, 21000, { credential: '3391-5520' }),
    C('c03', 'Redeemer Church', 'Fort Wayne, IN', 'Midwest', 'Samuel Okafor', 310000, 7750, { credential: '6012-8847' }),
    C('c04', 'Trinity Bible Church', 'Lansing, MI', 'Midwest', 'Mark Jensen', 185000, 6500, { credential: '7745-2016' }),
    C('c05', 'Hope Community Church', 'Hartford, CT', 'Northeast', 'Peter Alvarez', 960000, 14400, { credential: '2208-6631' }),
    C('c06', 'Christ Church Albany', 'Albany, NY', 'Northeast', 'James Whitfield', 240000, 10800, { credential: '5583-0472' }),
    C('c07', 'Providence Chapel', 'Providence, RI', 'Northeast', 'Thomas Reyes', 150000, 3600, { credential: '9170-3358', certified: false }),
    C('c08', 'Emmanuel Church', 'Charlotte, NC', 'Southeast', 'Andrew Booker', 1800000, 45000, { credential: '1446-7709' }),
    C('c09', 'Cornerstone Baptist Church', 'Greenville, SC', 'Southeast', 'Michael Grant', 520000, 26000, { credential: '8034-1125' }),
    C('c10', 'Calvary Church of Macon', 'Macon, GA', 'Southeast', 'David Price', 275000, 6875, { credential: '3659-4480' }),
    C('c11', 'Living Hope Church', 'Knoxville, TN', 'Southeast', 'Joshua Kim', 135000, 7425, { credential: '7221-9063', fullYear: false }),
    C('c12', 'Faith Reformed Church', 'Tulsa, OK', 'Southwest', 'Stephen Carter', 690000, 24150, { credential: '4908-2271' }),
    C('c13', 'Sovereign Grace Church', 'Albuquerque, NM', 'Southwest', 'Paul Herrera', 380000, 5700, { credential: '6375-8814' }),
    C('c14', 'Mesa Bible Fellowship', 'Mesa, AZ', 'Southwest', 'Nathan Brooks', 210000, 8400, { credential: '2590-6347' }),
    C('c15', 'Harbor Church', 'Tacoma, WA', 'West', 'Aaron Fischer', 450000, 9900, { credential: '8812-5096' }),
    C('c16', 'Christ the King Church', 'Boise, ID', 'West', 'Luke Yamamoto', 330000, 15180, { credential: '1067-3742' }),
    C('c17', 'New Life Fellowship', 'Fresno, CA', 'West', 'Caleb Morris', 260000, 7020, { credential: '5734-9128' }),
  ];
}

export function seedBallots() {
  return [
    {
      id: 'b-demo-1',
      kind: 'motion',
      type: 'procedural',
      title: 'Adopt the agenda',
      description: 'Adopt the printed agenda for the 2026 General Assembly.',
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
      title: 'Approve the 2027 ACME budget',
      description: 'Approve the 2027 operating budget of $1,240,000 as presented by the Finance Committee.',
      countRule: 'both',
      threshold: 'majority',
      region: null,
      status: 'draft',
      options: [],
      votes: {},
    },
  ];
}
