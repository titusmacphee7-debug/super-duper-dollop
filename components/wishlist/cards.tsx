import { Icon, type IconName } from "./icons";
import {
  fmt,
  hostOf,
  matchBasis,
  retailerMark,
  type EntryView,
  type ItemView,
  type ListingView,
  type RetailerError,
} from "./view-model";

const NAV_ITEMS: [IconName, string][] = [
  ["wishlist", "Wishlist"],
  ["projects", "Projects"],
  ["inventory", "Inventory"],
  ["tools", "Tools"],
  ["expenses", "Expenses"],
];

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

// ---------------- Sidebar ----------------
export function Sidebar({ active = "wishlist" }: { active?: IconName }) {
  return (
    <aside className="wb-sidebar">
      <div className="wb-brandmark">
        <span className="wb-brandmark-bolt">
          <Icon name="bolt" size={20} />
        </span>
      </div>
      <nav className="wb-nav">
        {NAV_ITEMS.map(([key, label]) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              className={"wb-navitem" + (isActive ? " is-active" : "")}
              aria-current={isActive ? "page" : undefined}
              disabled={!isActive}
              title={isActive ? undefined : "Coming soon"}
            >
              <Icon name={key} />
              <span>{label}</span>
              {isActive && <span className="wb-nav-rail" />}
            </button>
          );
        })}
      </nav>
      <div className="wb-sidebar-foot">
        <div className="wb-avatar">JM</div>
        <div>
          <div className="wb-foot-name">Jonas Meyer</div>
          <div className="wb-foot-sub">Garage · Bay 2</div>
        </div>
      </div>
    </aside>
  );
}

// ---------------- Header (controlled) ----------------
export function Header({
  value,
  onChange,
  onCompare,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onCompare: () => void;
  busy: boolean;
}) {
  return (
    <header className="wb-header">
      <div className="wb-wordmark">
        <span className="wb-wordmark-bolt">
          <Icon name="bolt" size={15} />
        </span>
        <span className="wb-wordmark-text">
          WORKSHOP<span className="wb-wordmark-thin"> BUDDY</span>
        </span>
      </div>
      <div className="wb-urlbar">
        <span className="wb-urlbar-icon">
          <Icon name="link" size={17} />
        </span>
        <input
          className="wb-urlinput"
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) onCompare();
          }}
          placeholder="Paste a product URL to compare prices…"
          aria-label="Product URL"
        />
        <button className="wb-cta" disabled={busy} onClick={onCompare}>
          {busy ? (
            <>
              <span className="wb-spin">
                <Icon name="refresh" size={15} />
              </span>{" "}
              Comparing…
            </>
          ) : (
            <>
              <Icon name="search" size={15} /> Compare
            </>
          )}
        </button>
      </div>
      <div className="wb-header-meta">
        <span className="wb-kbd">⌘</span>
        <span className="wb-kbd">V</span>
      </div>
    </header>
  );
}

// ---------------- Tags + confidence pip ----------------
function MatchPip({ score }: { score: number }) {
  const tier = score >= 1 ? "gold" : score >= 0.95 ? "strong" : score >= 0.8 ? "ok" : "low";
  const dots = score >= 1 ? 3 : score >= 0.8 ? 2 : 1;
  return (
    <span className={"wb-pip wb-pip--" + tier} title={matchBasis(score)}>
      <span className="wb-pip-dots">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < dots ? "on" : ""} />
        ))}
      </span>
      {Math.round(score * 100)}% match
    </span>
  );
}

function ConditionTag({ condition }: { condition: string | null }) {
  const c = condition || "new";
  const label = ({ new: "New", renewed: "Renewed", used: "Used", "open-box": "Open-box" } as Record<string, string>)[c] || c;
  return <span className={"wb-tag wb-tag--cond cond-" + c.replace(/\W/g, "")}>{label}</span>;
}

function StockTag({ inStock }: { inStock: boolean }) {
  return (
    <span className={"wb-tag wb-tag--stock " + (inStock ? "is-in" : "is-out")}>
      <i className="wb-dot" />
      {inStock ? "In stock" : "Out of stock"}
    </span>
  );
}

// ---------------- Source product ----------------
export function SourceProduct({
  item,
  saved,
  onSave,
}: {
  item: ItemView;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <section className="wb-source">
      <div className="wb-source-img">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} />
        ) : (
          <span className="wb-imgnote">product shot</span>
        )}
      </div>
      <div className="wb-source-body">
        <div className="wb-source-brandrow">
          {item.brand && <span className="wb-brandtag">{item.brand}</span>}
          {item.category && <span className="wb-source-cat">{item.category}</span>}
        </div>
        <h1 className="wb-source-name">{item.name}</h1>
        <div className="wb-source-ids">
          {item.modelNumber && (
            <span>
              MODEL <b>{item.modelNumber}</b>
            </span>
          )}
          {item.modelNumber && item.upc && <span className="wb-sep" />}
          {item.upc && (
            <span>
              UPC <b>{item.upc}</b>
            </span>
          )}
        </div>
        <div className="wb-source-foot">
          {item.sourceUrl ? (
            <a className="wb-srclink" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="link" size={14} /> {hostOf(item.sourceUrl)}
            </a>
          ) : (
            <span className="wb-srclink">
              <Icon name="link" size={14} /> source
            </span>
          )}
          <button className={"wb-savebtn" + (saved ? " is-saved" : "")} onClick={onSave}>
            {saved ? (
              <>
                <Icon name="check" size={15} /> Saved to wishlist
              </>
            ) : (
              <>
                <Icon name="plus" size={15} /> Save to wishlist
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------- Retailer card + skeleton + miss ----------------
export function RetailerCard({
  listing,
  best,
  showConfidence = true,
}: {
  listing: ListingView;
  best: boolean;
  showConfidence?: boolean;
}) {
  const mark = retailerMark(listing.retailer);
  const off = listing.originalPrice != null && listing.originalPrice > listing.price;
  return (
    <article className={"wb-rcard" + (best ? " is-best" : "") + (!listing.inStock ? " is-out" : "")}>
      {best && (
        <span className="wb-bestflag">
          <Icon name="bolt" size={13} /> Best deal
        </span>
      )}
      <div className="wb-rcard-left">
        <span className="wb-rmark" style={{ color: mark.tone }}>
          {mark.short}
        </span>
        <div className="wb-rcard-id">
          <div className="wb-rname">{listing.retailer}</div>
          <span className="wb-rurl">{shortUrl(listing.url)}</span>
          <div className="wb-rtags">
            <ConditionTag condition={listing.condition} />
            <StockTag inStock={listing.inStock} />
          </div>
        </div>
      </div>
      <div className="wb-rcard-right">
        <div className="wb-priceblock">
          {off && <span className="wb-was">{fmt(listing.originalPrice, listing.currency)}</span>}
          <span className="wb-price">{fmt(listing.price, listing.currency)}</span>
          {listing.shipping && <span className="wb-shipping">{listing.shipping}</span>}
        </div>
        {showConfidence && listing.matchScore != null && <MatchPip score={listing.matchScore} />}
        {listing.inStock ? (
          <a
            className={"wb-viewbtn" + (best ? " is-primary" : "")}
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View deal <Icon name="arrow" size={14} />
          </a>
        ) : (
          <button className="wb-viewbtn" disabled>
            Notify me
          </button>
        )}
      </div>
    </article>
  );
}

export function SkeletonCard({ retailer }: { retailer: string }) {
  const mark = retailerMark(retailer);
  return (
    <article className="wb-rcard is-skeleton">
      <div className="wb-rcard-left">
        <span className="wb-rmark wb-sk-mark">{mark.short}</span>
        <div className="wb-rcard-id">
          <div className="wb-rname wb-skel-text" style={{ width: 96 }} />
          <div className="wb-skel-text" style={{ width: 130, height: 11, marginTop: 8 }} />
          <div className="wb-skel-text" style={{ width: 150, height: 18, marginTop: 12, borderRadius: 5 }} />
        </div>
      </div>
      <div className="wb-rcard-right">
        <div className="wb-skel-text" style={{ width: 110, height: 30, borderRadius: 6 }} />
        <div className="wb-skel-text" style={{ width: 84, height: 13, marginTop: 10 }} />
      </div>
      <span className="wb-sk-label">searching {retailer}…</span>
    </article>
  );
}

export function MissCard({ error }: { error: RetailerError }) {
  const mark = retailerMark(error.retailer);
  return (
    <article className="wb-rcard is-miss">
      <div className="wb-rcard-left">
        <span className="wb-rmark wb-rmark--ghost">{mark.short}</span>
        <div className="wb-rcard-id">
          <div className="wb-rname">{error.retailer}</div>
          <div className="wb-miss-line">Couldn&rsquo;t find a confident match</div>
          <div className="wb-miss-sub">{error.message}</div>
        </div>
      </div>
      <div className="wb-rcard-right">
        <button className="wb-viewbtn">Search manually</button>
      </div>
    </article>
  );
}

// ---------------- Wishlist panel ----------------
function PriceDelta({ from, to }: { from: number | null; to: number | null }) {
  if (from == null || to == null || from === to) {
    return <span className="wb-delta wb-delta--flat">No change</span>;
  }
  const dropped = to < from;
  const diff = Math.abs(to - from);
  return (
    <span className={"wb-delta " + (dropped ? "wb-delta--drop" : "wb-delta--rise")}>
      <Icon name={dropped ? "down" : "up"} size={13} />
      {dropped ? "Dropped" : "Rose"} {fmt(diff)}
    </span>
  );
}

export function WishlistPanel({ name, entries }: { name: string; entries: EntryView[] }) {
  return (
    <section className="wb-panel">
      <div className="wb-panel-head">
        <h2>Saved wishlist</h2>
        <span className="wb-panel-count">{entries.length}</span>
      </div>
      <div className="wb-panel-sub">{name} · price-tracked since save</div>
      {entries.length === 0 ? (
        <div className="wb-panel-empty">No saved items yet — save a product to track its price.</div>
      ) : (
        <div className="wb-savelist">
          {entries.map((e) => (
            <div key={e.id} className={"wb-saverow" + (e.acquired ? " is-acquired" : "")}>
              <div className="wb-saverow-top">
                <div className="wb-save-name">
                  {e.brand && <span className="wb-save-brand">{e.brand} </span>}
                  {e.name}
                </div>
                {e.acquired && (
                  <span className="wb-acq">
                    <Icon name="check" size={12} /> Got it
                  </span>
                )}
              </div>
              {e.modelNumber && <div className="wb-save-model">{e.modelNumber}</div>}
              <div className="wb-saverow-bot">
                <div className="wb-save-price">
                  <span className="wb-save-now">{fmt(e.currentPrice)}</span>
                  <span className="wb-save-at">saved at {fmt(e.priceAtSave)}</span>
                </div>
                {e.acquired ? (
                  <span className="wb-delta wb-delta--flat">Acquired</span>
                ) : (
                  <PriceDelta from={e.priceAtSave} to={e.currentPrice} />
                )}
              </div>
              <div className="wb-save-foot">
                <span className={"wb-save-stock " + (e.inStock ? "" : "is-out")}>
                  <i className="wb-dot" />
                  {e.inStock ? e.cheapestRetailer ?? "In stock" : "Out of stock"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
