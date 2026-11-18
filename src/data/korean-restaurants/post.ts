export const koreanRestaurantPost = {
    title: '전세계 맛집들만 기록합니다',
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
