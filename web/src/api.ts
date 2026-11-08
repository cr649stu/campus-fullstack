import axios from "axios";
import type {
  Address,
  Answer,
  Cart,
  Comment,
  CountItem,
  MyStats,
  Order,
  Paged,
  Post,
  Product,
  Question,
  QuestionDetail,
  SiteStats,
  User,
} from "./types";

export const TOKEN_KEY = "bg_token";

const http = axios.create({ baseURL: "/api", timeout: 15000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message || "网络开小差了，请稍后再试";
  }
  return "出了点问题，请稍后再试";
}

const data = <T>(promise: Promise<{ data: T }>): Promise<T> => promise.then((res) => res.data);

interface PostQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
  keyword?: string;
  sort?: "latest" | "hot";
}

export const api = {
  // 认证
  login: (account: string, password: string) =>
    data<{ token: string; user: User }>(http.post("/auth/login", { account, password })),
  register: (username: string, email: string, password: string) =>
    data<{ token: string; user: User }>(http.post("/auth/register", { username, email, password })),
  me: () => data<{ user: User }>(http.get("/auth/me")),

  // 文章
  posts: (query: PostQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) params.set(key, String(value));
    });
    return data<Paged<Post>>(http.get(`/posts?${params.toString()}`));
  },
  post: (id: number | string) => data<{ post: Post }>(http.get(`/posts/${id}`)),
  createPost: (payload: Partial<Post> & { tags: string[] }) =>
    data<{ post: Post }>(http.post("/posts", payload)),
  updatePost: (id: number, payload: Partial<Post> & { tags: string[] }) =>
    data<{ post: Post }>(http.put(`/posts/${id}`, payload)),
  deletePost: (id: number) => data<{ ok: true }>(http.delete(`/posts/${id}`)),
  likePost: (id: number) => data<{ liked: boolean; likes: number }>(http.post(`/posts/${id}/like`)),
  postCategories: () => data<CountItem[]>(http.get("/posts/meta/categories")),
  postTags: () => data<CountItem[]>(http.get("/posts/meta/tags")),

  // 评论
  comments: (postId: number | string) => data<Comment[]>(http.get(`/posts/${postId}/comments`)),
  addComment: (postId: number | string, content: string) =>
    data<Comment>(http.post(`/posts/${postId}/comments`, { content })),
  deleteComment: (id: number) => data<{ ok: true }>(http.delete(`/comments/${id}`)),

  // 问答
  questions: (query: { sort?: string; tag?: string; page?: number; pageSize?: number } = {}) =>
    data<Paged<Question>>(http.get("/questions", { params: query })),
  question: (id: number | string) => data<QuestionDetail>(http.get(`/questions/${id}`)),
  askQuestion: (payload: { title: string; content: string; tags: string[] }) =>
    data<{ question: Question }>(http.post("/questions", payload)),
  answerQuestion: (id: number | string, content: string) =>
    data<{ answer: Answer }>(http.post(`/questions/${id}/answers`, { content })),
  voteQuestion: (id: number) =>
    data<{ liked: boolean; votes: number }>(http.post(`/questions/${id}/vote`)),
  voteAnswer: (id: number) =>
    data<{ liked: boolean; votes: number }>(http.post(`/questions/answers/${id}/vote`)),
  acceptAnswer: (id: number) => data<{ ok: true }>(http.post(`/questions/answers/${id}/accept`)),
  questionTags: () => data<CountItem[]>(http.get("/questions/meta/tags")),

  // 商城
  products: (query: { category?: string; keyword?: string } = {}) =>
    data<Product[]>(http.get("/products", { params: query })),
  product: (id: number | string) => data<Product>(http.get(`/products/${id}`)),
  productCategories: () => data<CountItem[]>(http.get("/products/meta/categories")),
  cart: () => data<Cart>(http.get("/cart")),
  addToCart: (productId: number, quantity = 1) =>
    data<Cart>(http.post("/cart", { productId, quantity })),
  updateCartItem: (id: number, quantity: number) =>
    data<Cart>(http.put(`/cart/${id}`, { quantity })),
  removeCartItem: (id: number) => data<Cart>(http.delete(`/cart/${id}`)),

  addresses: () => data<Address[]>(http.get("/addresses")),
  createAddress: (payload: Omit<Address, "id">) => data<Address>(http.post("/addresses", payload)),
  deleteAddress: (id: number) => data<{ ok: true }>(http.delete(`/addresses/${id}`)),

  orders: () => data<Order[]>(http.get("/orders")),
  order: (id: number | string) => data<Order>(http.get(`/orders/${id}`)),
  createOrder: (addressId: number, cartItemIds: number[]) =>
    data<Order>(http.post("/orders", { addressId, cartItemIds })),
  cancelOrder: (id: number) => data<Order>(http.put(`/orders/${id}/cancel`)),

  // 统计
  siteStats: () => data<SiteStats>(http.get("/stats/site")),
  myStats: () => data<MyStats>(http.get("/stats/me")),
};

export const COVER_PRESETS = [
  "/static/covers/library.jpg",
  "/static/covers/library-aisle.jpg",
  "/static/covers/campus.jpg",
  "/static/covers/dorm.jpg",
  "/static/covers/desk.jpg",
  "/static/covers/writing.jpg",
  "/static/covers/night.jpg",
  "/static/covers/bicycle.jpg",
  "/static/covers/food.jpg",
  "/static/covers/team.jpg",
  "/static/covers/architecture.jpg",
  "/static/covers/caps.jpg",
];
