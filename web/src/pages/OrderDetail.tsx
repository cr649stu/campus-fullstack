import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api";
import type { Order } from "../types";
import { formatPrice, formatTime } from "../lib/format";
import { EmptyState, Loading } from "../components/ui";

const STEPS = ["待支付", "已支付", "已发货", "已完成"];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    api
      .order(id!)
      .then(setOrder)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [id]);

  const cancel = async () => {
    if (!order || !window.confirm("确定取消这笔订单？库存会恢复。")) return;
    try {
      const updated = await api.cancelOrder(order.id);
      setOrder(updated);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <Loading label="正在打开订单" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container page">
        <EmptyState
          title="没有找到这笔订单"
          description={error}
          action={
            <Link to="/orders" className="btn btn--small">
              返回订单
            </Link>
          }
        />
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(order.status);

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/orders">订单</Link>
        <span>/</span>
        <span>{order.order_no}</span>
      </nav>

      <header className="order-detail__head">
        <div>
          <p className="eyebrow">ORDER</p>
          <h1>{order.status === "已发货" ? "已经寄出，注意查收。" : "订单详情"}</h1>
          <p className="order-detail__meta">
            订单号 {order.order_no} · {formatTime(order.created_at)}
          </p>
        </div>
        <span className={`status status--${order.status}`}>{order.status}</span>
      </header>

      <ol className="order-steps">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={`${index <= stepIndex ? "is-done" : ""} ${order.status === "已取消" ? "is-cancelled" : ""}`}
          >
            <span className="order-steps__dot" />
            <span>{step}</span>
          </li>
        ))}
        {order.status === "已取消" && <li className="is-cancelled">已取消</li>}
      </ol>

      <div className="order-detail">
        <div className="order-detail__main">
          <section className="checkout-block">
            <div className="checkout-block__head">
              <h2>收货信息</h2>
            </div>
            <div className="order-address">
              <p>
                {order.address.name} <span>{order.address.phone}</span>
              </p>
              <p>
                {order.address.region} {order.address.detail}
              </p>
            </div>
          </section>

          <section className="checkout-block">
            <div className="checkout-block__head">
              <h2>商品</h2>
            </div>
            <ul className="checkout-items">
              {order.items.map((item) => (
                <li key={item.id}>
                  <div className="checkout-items__body">
                    <p>{item.name}</p>
                    <span>
                      {formatPrice(item.price)} × {item.quantity}
                    </span>
                  </div>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="cart-summary">
          <p className="eyebrow">SUMMARY</p>
          <h2>金额</h2>
          <dl>
            <div>
              <dt>商品合计</dt>
              <dd>{formatPrice(order.total_price)}</dd>
            </div>
            <div>
              <dt>运费</dt>
              <dd>已包含</dd>
            </div>
            <div className="cart-summary__total">
              <dt>实付</dt>
              <dd>{formatPrice(order.total_price)}</dd>
            </div>
          </dl>
          {order.status === "待支付" && (
            <button type="button" className="btn btn--block" onClick={cancel}>
              取消订单
            </button>
          )}
          <button type="button" className="btn btn--outline btn--block" onClick={() => navigate("/orders")}>
            返回订单列表
          </button>
          <p className="cart-summary__note">演示项目：支付、物流均为模拟状态，不产生真实交易。</p>
        </aside>
      </div>
    </div>
  );
}
