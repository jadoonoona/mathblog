export const koreanRestaurantPost = {
    title: '해외에서 만난 한식당',
    date: '2026-11-08',
    description: '여행하다 문득 한식이 생각날 때. 직접 방문한 해외 한식당과 그곳에서 먹었던 한 끼를 기록합니다.',
    tags: ['Travel', '한식'], category: 'Travel', lang: 'ko',
    url: `${import.meta.env.BASE_URL}ko/blog/korean-restaurants/`,
};

export const restaurantPost = {
    ...koreanRestaurantPost,
    title: 'Korean Restaurants Abroad',
    description: 'For the moments when I crave Korean food on the road. A personal record of Korean restaurants I have visited abroad and the meals I had there.',
    tags: ['Travel', 'Korean food'], lang: 'en',
    url: `${import.meta.env.BASE_URL}blog/korean-restaurants/`,
};
