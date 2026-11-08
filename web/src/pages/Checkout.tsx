import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api";
import { useCart } from "../cart";
import type { Address } from "../types";
import { formatPrice } from "../lib/format";
import { EmptyState, ErrorNote, Loading } from "../components/ui";

const EMPTY_FORM = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  detail: "",
};

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, setCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadAddresses = async () => {
    const list = await api.addresses();
    setAddresses(list);
    setSelected((current) => current ?? list.find((item) => item.is_default)?.id ?? list[0]?.id ?? null);
    setShowForm(list.length === 0);
  };

  useEffect(() => {
    loadAddresses()
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const saveAddress = async () => {
    if (!form.name || !form.phone || !form.province || !form.city || !form.district || !form.detail) {
      setError("请完整填写收货信息");
      return;
    }
    setError("");
    try {
      const address = await api.createAddress({ ...form, is_default: addresses.length === 0 });
      setAddresses([address, ...addresses]);
      setSelected(address.id);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const placeOrder = async () => {
    if (!selected) {
      setError("请选择收货地址");
      return;
    }
    if (cart.items.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await api.createOrder(
        selected,
        cart.items.map((item) => item.id),
      );
      setCart({ items: [], total: 0, count: 0 });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <Loading label="正在核对订单" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <EmptyState
          title="没有需要结算的商品"
          description="先去购物袋里放几件东西。"
          action={
            <Link to="/shop" className="btn btn--small">
              去纪念区
            </Link>
          }
        />
      </div>
    );
  }

  const shipping = cart.total >= 99 ? 0 : 8;

  return (
    <div className="container page">
      <header className="write-head">
        <div>
          <p className="eyebrow">CHECKOUT</p>
          <h1>确认订单</h1>
          <p className="write-head__desc">填写收货信息，确认商品与金额。</p>
        </div>
        <div className="write-head__meta">
          <span>{cart.count} 件商品</span>
        </div>
      </header>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-block">
            <div className="checkout-block__head">
              <h2>收货地址</h2>
              {!showForm && (
                <button type="button" className="link-button" onClick={() => setShowForm(true)}>
                  + 新增地址
                </button>
              )}
            </div>

            <div className="address-list">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={`address-card ${selected === address.id ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selected === address.id}
                    onChange={() => setSelected(address.id)}
                  />
                  <div>
                    <p className="address-card__name">
                      {address.name}
                      <span>{address.phone}</span>
                      {address.is_default && <em>默认</em>}
                    </p>
                    <p className="address-card__detail">
                      {address.province} {address.city} {address.district} {address.detail}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {showForm && (
              <div className="address-form">
                <div className="field-row">
                  <label className="field">
                    <span className="field__label">收货人</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="姓名"
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">手机号</span>
                    <input
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                      placeholder="13800000000"
                    />
                  </label>
                </div>
                <div className="field-row field-row--three">
                  <label className="field">
                    <span className="field__label">省</span>
                    <input
                      value={form.province}
                      onChange={(event) => setForm({ ...form, province: event.target.value })}
                      placeholder="上海市"
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">市</span>
                    <input
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                      placeholder="上海市"
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">区</span>
                    <input
                      value={form.district}
                      onChange={(event) => setForm({ ...form, district: event.target.value })}
                      placeholder="杨浦区"
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field__label">详细地址</span>
                  <input
                    value={form.detail}
                    onChange={(event) => setForm({ ...form, detail: event.target.value })}
                    placeholder="街道、门牌号、楼层"
                  />
                </label>
                <div className="address-form__actions">
                  <button type="button" className="btn btn--small" onClick={saveAddress}>
                    保存地址
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setShowForm(false)}
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="checkout-block">
            <div className="checkout-block__head">
              <h2>商品清单</h2>
              <Link to="/cart" className="link-button">
                修改
              </Link>
            </div>
            <ul className="checkout-items">
              {cart.items.map((item) => (
                <li key={item.id}>
                  <img src={item.product.image} alt={item.product.name} />
                  <div className="checkout-items__body">
                    <p>{item.product.name}</p>
                    <span>
                      {formatPrice(item.product.price)} × {item.quantity}
                    </span>
                  </div>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="cart-summary checkout-summary">
          <p className="eyebrow">TOTAL</p>
          <h2>支付明细</h2>
          <dl>
            <div>
              <dt>商品合计</dt>
              <dd>{formatPrice(cart.total)}</dd>
            </div>
            <div>
              <dt>运费</dt>
              <dd>{shipping === 0 ? "免运费" : formatPrice(shipping)}</dd>
            </div>
            <div className="cart-summary__total">
              <dt>应付</dt>
              <dd>{formatPrice(cart.total + shipping)}</dd>
            </div>
          </dl>
          {error && <ErrorNote message={error} />}
          <button
            type="button"
            className="btn btn--block"
            onClick={placeOrder}
            disabled={submitting || !selected}
          >
            {submitting ? "提交中…" : "提交订单"}
          </button>
          <p className="cart-summary__note">
            提交后订单状态为「待支付」。本页面为课程练习，不接入真实支付。
          </p>
        </aside>
      </div>
    </div>
  );
}
