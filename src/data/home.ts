export interface InterestArea {
    number: string;
    title: string;
    description: string;
    topics: string[];
    link: string;
    projectCategory: string;
    linkLabel: string;
}

export interface FeaturedProject {
    number: string;
    title: string;
    description: string;
    tags: string[];
    link: string;
    linkLabel: string;
    category: string;
    featured?: boolean;
    status?: string;
}

export const INTEREST_AREAS: InterestArea[] = [
    { number: '01', title: 'Mathematics & Statistics', description: 'Building the quantitative foundation for better questions and clearer decisions.', topics: ['Linear algebra', 'Probability', 'Regression', 'Quantitative methods'], link: 'projects/mathematics/', projectCategory: 'mathematics', linkLabel: 'Explore area' },
    { number: '02', title: 'Finance', description: 'Studying how capital, markets, and real-world constraints shape value.', topics: ['Equity', 'Property', 'Macro', 'Valuation'], link: 'projects/finance/', projectCategory: 'finance', linkLabel: 'View projects' },
    { number: '03', title: 'Data & Risk Analytics', description: 'Turning financial questions into measurable, repeatable analysis.', topics: ['Python', 'SQL', 'Market risk', 'Volatility', 'Automation'], link: 'projects/data-risk/', projectCategory: 'data-risk', linkLabel: 'Explore area' },
    { number: '04', title: 'App/Web development', description: 'Making useful tools where analysis meets thoughtful product design.', topics: ['Mobile development', 'React Native', 'Supabase', 'Product design'], link: 'projects/app-web/', projectCategory: 'app-web', linkLabel: 'View projects' },
];

export const FEATURED_PROJECTS: FeaturedProject[] = [
    { number: '01', title: 'Hotel Asset Management & Capex Investment Analysis', description: 'An interactive hotel operating model comparing room rates, occupancy, revenue and EBITDA.', tags: ['Finance', 'Hotel', 'Modelling'], link: 'projects/hotel-asset-management/', linkLabel: 'Open operating model', category: 'finance', status: 'Phases 1–5 available' },
    { number: '02', title: 'Our Trip Plan', description: 'A collaborative travel planning product built to make shared itineraries easier to manage.', tags: ['Mobile', 'React Native', 'Travel app'], link: 'https://ourtripplan.com', linkLabel: 'View the project', category: 'app-web', status: 'Live' },
];
