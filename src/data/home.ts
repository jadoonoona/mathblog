export interface InterestArea {
    number: string;
    title: string;
    description: string;
    topics: string[];
    link: string;
}

export interface FeaturedProject {
    number: string;
    title: string;
    description: string;
    tags: string[];
    link: string;
    linkLabel: string;
    featured?: boolean;
}

export const INTEREST_AREAS: InterestArea[] = [
    { number: '01', title: 'Mathematics & Statistics', description: 'Building the quantitative foundation for better questions and clearer decisions.', topics: ['Linear algebra', 'Probability', 'Regression', 'Quantitative methods'], link: 'math-notes/' },
    { number: '02', title: 'Finance & Investment', description: 'Studying how capital, markets, and real-world constraints shape value.', topics: ['Equity', 'Property', 'Macro', 'Valuation'], link: 'blog/' },
    { number: '03', title: 'Data & Risk Analytics', description: 'Turning messy financial questions into measurable, repeatable analysis.', topics: ['Python', 'SQL', 'Market risk', 'Volatility', 'Automation'], link: 'blog/' },
    { number: '04', title: 'Product & Development', description: 'Making useful tools where analysis meets thoughtful product design.', topics: ['Mobile development', 'React Native', 'Supabase', 'Product design'], link: '#projects' },
];

export const FEATURED_PROJECTS: FeaturedProject[] = [
    { number: '01', title: 'Market Risk Analytics', description: 'A working space for exploring volatility, drawdown, and the risk behind market returns.', tags: ['Python', 'Risk', 'Data'], link: 'blog/', linkLabel: 'Explore writing', featured: true },
    { number: '02', title: 'Real Estate Investment Model', description: 'A practical framework for thinking through property cash flows, assumptions, and valuation.', tags: ['Property', 'Valuation'], link: 'blog/', linkLabel: 'Coming to the notebook' },
    { number: '03', title: 'Project Finance Case Study', description: 'Notes on structuring long-term projects, risk allocation, and the numbers that make them work.', tags: ['Project finance', 'Modelling'], link: 'blog/', linkLabel: 'Coming to the notebook' },
    { number: '04', title: 'Our Trip Plan', description: 'A collaborative travel planning product built to make shared itineraries easier to manage.', tags: ['Mobile', 'React Native', 'Supabase'], link: 'https://ourtripplan.com', linkLabel: 'View the project' },
];
