import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api";
import { useAuth } from "../auth";
import { useCart } from "../cart";
import { useToast } from "../toast";
import type { Product } from "../types";
import { formatPrice } from "../lib/format";
import { EmptyState, Loading } from "../components/ui";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .product(id!)
      .then(async (result) => {
        if (cancelled) return;
        setProduct(result);
        setQuantity(1);
        const list = (await api.products({ category: result.category })).filter(
          (item) => item.id !== result.id,
        );
        if (list.length < 4) {
          const everything = await api.products();
          for (const item of everything) {
            if (item.id !== result.id && !list.some((existing) => existing.id === item.id)) {
              list.push(item);
            }
            if (list.length >= 4) break;
          }
        }
        if (!cancelled) setRelated(list.slice(0, 4));
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addToCart = async (goCheckout = false) => {
    if (!product) return;
    if (!user) {
      navigate(`/login?next=/shop/${product.id}`);
      return;
    }
    setAdding(true);
    try {
      await add(product.id, quantity);
      if (goCheckout) navigate("/checkout");
      else toast("已放进购物袋");
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <Loading label="正在取货" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container page">
        <EmptyState
          title="没有找到这件商品"
          description={error}
          action={
            <Link to="/shop" className="btn btn--small">
              回到纪念
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/shop">纪念</Link>
        <span>/</span>
        <span>{product.category}</span>
      </nav>

      <div className="product-detail">
        <div className="product-detail__media">
          <img src={product.image} alt={product.name} />
          <p className="product-detail__caption">摄影 / 后期：校园文创工作室</p>
        </div>

        <div className="product-detail__info">
          <p className="product-detail__category">{product.category} · 毕业纪念</p>
          <h1>{product.name}</h1>
          <p className="product-detail__subtitle">{product.subtitle}</p>
          <p className="product-detail__price">{formatPrice(product.price)}</p>

          <p className="product-detail__desc">{product.description}</p>

          <dl className="product-detail__specs">
            <div>
              <dt>库存</dt>
              <dd>{product.stock} 件</dd>
            </div>
            <div>
              <dt>发货</dt>
              <dd>每周三 / 周五</dd>
            </div>
            <div>
              <dt>运费</dt>
              <dd>满 ¥99 包邮</dd>
            </div>
            <div>
              <dt>自提</dt>
              <dd>图书馆正门</dd>
            </div>
          </dl>

          <div className="buy-row">
            <div className="stepper" aria-label="数量">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn buy-row__button"
              onClick={() => addToCart(false)}
              disabled={adding || product.stock === 0}
            >
              {product.stock === 0 ? "暂时售罄" : adding ? "加入中…" : "加入购物袋"}
            </button>
            <button
              type="button"
              className="btn btn--outline buy-row__button"
              onClick={() => addToCart(true)}
              disabled={adding || product.stock === 0}
            >
              直接结算
            </button>
          </div>

          <p className="product-detail__note">
            所有商品为课程练习项目的示例数据，不产生真实交易。
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related related--shop">
          <div className="section-head">
            <div className="section-head__left">
              <span className="section-head__index">→</span>
              <div>
                <p className="eyebrow">YOU MAY ALSO LIKE</p>
                <h2>同类纪念</h2>
              </div>
            </div>
          </div>
          <div className="related__grid related__grid--four">
            {related.map((item) => (
              <Link to={`/shop/${item.id}`} className="related__item" key={item.id}>
                <img src={item.image} alt={item.name} loading="lazy" />
                <p className="related__meta">{item.category}</p>
                <h3>{item.name}</h3>
                <p className="related__price">{formatPrice(item.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
