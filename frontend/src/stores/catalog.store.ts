import { defineStore } from 'pinia';
import api from '../services/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
}

export interface ProductImage {
  id: number;
  url: string;
  thumb_url: string | null;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  reference: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  specs: Record<string, any> | null;
  unit: string;
  box_size: number;
  category_id: number | null;
  category_name?: string | null;
  images: ProductImage[];
  primary_image: string | null;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  sale_price?: number;
  tva?: number;
  price_ttc?: number;
  min_order_qty?: number;
  purchase_price?: number;
  margin_amount?: number;
  margin_percent?: number;
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    categories: [] as Category[],
    products: [] as Product[],
    currentProduct: null as Product | null,
    activeCategory: '' as string,
    searchQuery: '' as string,
    selectedBrand: '' as string,
    meta: {
      page: 1,
      pageSize: 24,
      total: 0,
      totalPages: 1,
    },
    loading: false,
    error: null as string | null,
  }),

  getters: {
    brands: (state) => {
      const bSet = new Set<string>();
      state.products.forEach((p) => {
        if (p.brand) bSet.add(p.brand);
      });
      return Array.from(bSet).sort();
    },
  },

  actions: {
    async fetchCategories() {
      try {
        const res = await api.get('/public/categories');
        this.categories = res.data.data;
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    },

    async fetchProducts(page = 1) {
      this.loading = true;
      this.error = null;
      try {
        const params: Record<string, any> = {
          page,
          pageSize: this.meta.pageSize,
        };

        if (this.activeCategory) params.category = this.activeCategory;
        if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
        if (this.selectedBrand) params.brand = this.selectedBrand;

        const res = await api.get('/public/products', { params });
        this.products = res.data.data;
        if (res.data.meta) {
          this.meta = res.data.meta;
        }
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Erreur lors du chargement des produits';
      } finally {
        this.loading = false;
      }
    },

    async fetchProductBySlug(slug: string) {
      this.loading = true;
      this.error = null;
      this.currentProduct = null;
      try {
        const res = await api.get(`/public/products/${slug}`);
        this.currentProduct = res.data.data;
        return this.currentProduct;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Produit introuvable';
        return null;
      } finally {
        this.loading = false;
      }
    },

    setCategory(categorySlug: string) {
      if (this.activeCategory === categorySlug) {
        this.activeCategory = '';
      } else {
        this.activeCategory = categorySlug;
      }
      this.fetchProducts(1);
    },

    setSearch(query: string) {
      this.searchQuery = query;
      this.fetchProducts(1);
    },

    setBrand(brand: string) {
      this.selectedBrand = brand;
      this.fetchProducts(1);
    },

    resetFilters() {
      this.activeCategory = '';
      this.searchQuery = '';
      this.selectedBrand = '';
      this.fetchProducts(1);
    },
  },
});

