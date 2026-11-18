export const koreanRestaurantPost = {
    title: '해외에서 만난 한식당',
    date: '2026-11-08',
    description: '전섹계를 여행하며 방문한 식당들과 그곳에서 먹었던 한 끼를 기록합니다.',
    tags: ['Travel', 'food'], category: 'Travel', lang: 'ko',
    url: `${import.meta.env.BASE_URL}ko/blog/korean-restaurants/`,
};

export const restaurantPost = {
    ...koreanRestaurantPost,
    title: 'Restaurants around the world',
    description: 'A personal record of restaurants I have visited travelling around the world and the meals I had there.',
    tags: ['Travel', 'food'], lang: 'en',
    url: `${import.meta.env.BASE_URL}blog/korean-restaurants/`,
};
