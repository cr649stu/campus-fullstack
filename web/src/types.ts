export interface User {
  id: number;
  username: string;
  email?: string;
  avatar?: string | null;
  bio: string;
  points: number;
  created_at?: string;
}

export interface Author {
  id: number;
  username: string;
  avatar?: string | null;
  bio?: string;
}

export interface Post {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  tags: string[];
  author: Author;
  views: number;
  likes: number;
  comments: number;
  liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: Author;
}

export interface Question {
  id: number;
  title: string;
  content: string;
  tags: string[];
  author: Author;
  views: number;
  votes: number;
  answers_count: number;
  liked: boolean;
  is_solved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: number;
  content: string;
  votes: number;
  is_accepted: boolean;
  liked: boolean;
  created_at: string;
  author: Author;
}

export interface QuestionDetail {
  question: Question;
  answers: Answer[];
}

export interface Product {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
}

export interface CartItem {
  id: number;
  quantity: number;
  subtotal: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  total: number;
  count: number;
}

export interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  product_id: number;
}

export interface Order {
  id: number;
  order_no: string;
  status: string;
  total_price: number;
  address: { name: string; phone: string; region: string; detail: string };
  created_at: string;
  items: OrderItem[];
  count: number;
}

export interface SiteStats {
  posts: number;
  questions: number;
  answers: number;
  products: number;
  users: number;
  comments: number;
  categories: { name: string; count: number }[];
  tags: { name: string; count: number }[];
}

export interface MyStats {
  points: number;
  posts: number;
  views: number;
  likes: number;
  answers: number;
  answerVotes: number;
  comments: number;
  recentPosts: {
    id: number;
    title: string;
    category: string;
    created_at: string;
    views: number;
    likes: number;
  }[];
}

export interface CountItem {
  name: string;
  count: number;
}
