export const brinsonPost = {
    title: 'Why Did We Beat the Benchmark? An Interactive Guide to Brinson Attribution',
    date: '2026-11-16',
    description: 'Change sector weights and returns, decompose active return into allocation, selection and interaction, compare BHB with BF, and reproduce the analysis in Python.',
    tags: ['Finance', 'Portfolio Analytics', 'Python'], category: 'Finance', lang: 'en',
    url: `${import.meta.env.BASE_URL}blog/brinson-attribution/`,
};
export const koreanBrinsonPost = {
    ...brinsonPost,
    title: '벤치마크를 이긴 이유는? 직접 조작하며 이해하는 Brinson Attribution',
    description: '비중과 수익률을 바꾸며 배분·선택·상호작용 효과를 분해하고, BHB와 BF를 비교하며 Python으로 재현하는 단일 기간 성과 분석 실험.',
    lang: 'ko',
    url: `${import.meta.env.BASE_URL}ko/blog/brinson-attribution/`,
};
