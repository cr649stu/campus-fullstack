import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { CountItem, Product } from "../types";
import { formatPrice } from "../lib/format";
import { EmptyState, Loading, PageHead } from "../components/ui";

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const keyword = params.get("keyword") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CountItem[]>([]);
  const [draft, setDraft] = useState(keyword);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .products({ category, keyword })
      .then((list) => {
        if (!cancelled) {
          setProducts(list);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "载入失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, keyword]);

  useEffect(() => {
    api.productCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setDraft(keyword);
  }, [keyword]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setParams(next);
  };

  return (
    <div className="container page">
      <PageHead
        index="03"
        latin="OBJECTS / 纪念"
        title="带走一件纪念"
        description="不做爆款，只做会用得上的东西。每一件都和这座校园有关。"
        meta={
          <>
            <span>{products.length} 件商品</span>
            <span className="dot" />
            <span>满 ¥99 包邮</span>
          </>
        }
        action={
          <Link to="/cart" className="btn btn--outline">
            购物袋
          </Link>
        }
      />

      <div className="toolbar">
        <div className="tabs">
          <button
            type="button"
            className={!category ? "is-active" : ""}
            onClick={() => update({ category: null })}
          >
            全部
          </button>
          {categories.map((item) => (
            <button
              key={item.name}
              type="button"
              className={category === item.name ? "is-active" : ""}
              onClick={() => update({ category: item.name })}
            >
              {item.name}
              <em>{item.count}</em>
            </button>
          ))}
        </div>
        <form
          className="search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ keyword: draft.trim() || null });
          }}
        >
          <input
            ref={searchRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="搜索纪念品"
            aria-label="搜索商品"
          />
          <button type="submit" aria-label="搜索">
            →
          </button>
        </form>
      </div>

      {loading && <Loading label="正在铺开货架" />}
      {error && <p className="form-error">{error}</p>}
      {!loading && products.length === 0 && (
        <EmptyState title="没有找到商品" description="换个分类，或者清空搜索词。" />
      )}

      <div className="product-grid">
        {products.map((product) => (
          <Link to={`/shop/${product.id}`} className="product-card" key={product.id}>
            <div className="product-card__media">
              <img src={product.image} alt={product.name} loading="lazy" />
              {product.stock <= 25 && <span className="product-card__stock">仅剩 {product.stock}</span>}
            </div>
            <div className="product-card__body">
              <p className="product-card__meta">{product.category}</p>
              <h2>{product.name}</h2>
              <p className="product-card__subtitle">{product.subtitle}</p>
              <p className="product-card__price">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="shop-note">
        <div>
          <p className="eyebrow">SHIPPING</p>
          <h2>关于发货</h2>
        </div>
        <p>
          所有纪念品由校园文创工作室印制与打包，每周三、周五统一发出。校内可以约在图书馆门口自提，
          下单时在地址备注「自提」即可。满 ¥99 包邮。
        </p>
      </section>
    </div>
  );
}
