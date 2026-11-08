import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Order } from "../types";
import { formatPrice, formatTime, padNumber } from "../lib/format";
import { EmptyState, Loading, PageHead } from "../components/ui";

const FILTERS = ["全部", "待支付", "已发货", "已完成", "已取消"];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("全部");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .orders()
      .then((list) => {
        if (!cancelled) setOrders(list);
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
  }, []);

  const visible = filter === "全部" ? orders : orders.filter((order) => order.status === filter);

  return (
    <div className="container page">
      <PageHead
        index="—"
        latin="ORDERS / 订单"
        title="我的订单"
        description="每一单都是一次告别练习。"
        meta={
          <>
            <span>{padNumber(orders.length)} 笔订单</span>
            <span className="dot" />
            <span>课程演示数据</span>
          </>
        }
        action={
          <Link to="/shop" className="link-button">
            继续挑选 →
          </Link>
        }
      />

      <div className="tabs tabs--plain">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? "is-active" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading && <Loading label="正在取回订单" />}
      {error && <p className="form-error">{error}</p>}

      {!loading && visible.length === 0 && (
        <EmptyState
          title="这里还没有订单"
          description="去纪念区挑一件东西，练习一次告别。"
          action={
            <Link to="/shop" className="btn btn--small">
              去逛逛
            </Link>
          }
        />
      )}

      <div className="order-list">
        {visible.map((order) => (
          <article className="order-card" key={order.id}>
            <header className="order-card__head">
              <div>
                <p className="order-card__no">订单号 {order.order_no}</p>
                <p className="order-card__time">{formatTime(order.created_at)}</p>
              </div>
              <span className={`status status--${order.status}`}>{order.status}</span>
            </header>

            <div className="order-card__items">
              {order.items.map((item) => (
                <div className="order-card__item" key={item.id}>
                  <span className="order-card__qty">{item.quantity} ×</span>
                  <span>{item.name}</span>
                  <span className="order-card__price">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>

            <footer className="order-card__foot">
              <p>
                共 {order.count} 件 · 合计 <strong>{formatPrice(order.total_price)}</strong>
              </p>
              <Link to={`/orders/${order.id}`} className="btn btn--small">
                查看详情
              </Link>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
