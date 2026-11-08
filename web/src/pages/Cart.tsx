import { Link } from "react-router-dom";
import { useCart } from "../cart";
import { useAuth } from "../auth";
import { formatPrice } from "../lib/format";
import { EmptyState, PageHead } from "../components/ui";

export default function Cart() {
  const { cart, updateQuantity, remove } = useCart();
  const { user } = useAuth();

  const shipping = cart.total >= 99 || cart.items.length === 0 ? 0 : 8;

  return (
    <div className="container page">
      <PageHead
        index="—"
        latin="BAG / 购物袋"
        title="购物袋"
        description="确认一下要带走的东西。毕业之前，轻装上路。"
        meta={
          <>
            <span>{cart.count} 件商品</span>
            <span className="dot" />
            <span>满 ¥99 包邮</span>
          </>
        }
        action={
          <Link to="/shop" className="link-button">
            继续挑选 →
          </Link>
        }
      />

      {!user ? (
        <EmptyState
          title="登录后才能查看购物袋"
          description="购物袋和订单都跟着账号走。"
          action={
            <Link to="/login?next=/cart" className="btn btn--small">
              去登录
            </Link>
          }
        />
      ) : cart.items.length === 0 ? (
        <EmptyState
          title="购物袋是空的"
          description="去纪念区看看，总有一件适合带走。"
          action={
            <Link to="/shop" className="btn btn--small">
              去逛逛
            </Link>
          }
        />
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            <div className="cart-list__head">
              <span>商品</span>
              <span>单价</span>
              <span>数量</span>
              <span>小计</span>
              <span />
            </div>
            {cart.items.map((item) => (
              <div className="cart-row" key={item.id}>
                <div className="cart-row__product">
                  <Link to={`/shop/${item.product.id}`} className="cart-row__media">
                    <img src={item.product.image} alt={item.product.name} />
                  </Link>
                  <div>
                    <Link to={`/shop/${item.product.id}`} className="cart-row__name">
                      {item.product.name}
                    </Link>
                    <p className="cart-row__meta">{item.product.subtitle}</p>
                  </div>
                </div>
                <span className="cart-row__price">{formatPrice(item.product.price)}</span>
                <div className="stepper stepper--small">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, Math.min(item.product.stock, item.quantity + 1))
                    }
                    disabled={item.quantity >= item.product.stock}
                  >
                    +
                  </button>
                </div>
                <span className="cart-row__subtotal">{formatPrice(item.subtotal)}</span>
                <button type="button" className="cart-row__remove" onClick={() => remove(item.id)}>
                  移除
                </button>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="eyebrow">SUMMARY</p>
            <h2>订单摘要</h2>
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
                <dt>应付合计</dt>
                <dd>{formatPrice(cart.total + shipping)}</dd>
              </div>
            </dl>
            <Link to="/checkout" className="btn btn--block">
              去结算
            </Link>
            <p className="cart-summary__note">
              校内可约在图书馆正门自提；下单后请在 24 小时内完成支付（演示项目不产生真实交易）。
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
