import { classDirective } from "../../directive/class/class.ts";
import { ngClickDirective } from "../../directive/events/events.ts";
import { ngRepeatDirective } from "../../directive/repeat/repeat.ts";
import { defineAngularElement } from "../../runtime/web-component.ts";

/**
 * @typedef {{ id: number, name: string, stock: number, status: string }} InventoryItem
 * @typedef {{
 *   items: InventoryItem[],
 *   resetToken?: number,
 *   ship?: (item: InventoryItem) => void,
 *   restock?: () => void,
 *   title?: string,
 *   total: number
 * }} InventoryScope
 */

class InventoryStore {
  /** @returns {InventoryItem[]} */
  createItems() {
    return [
      { id: 1, name: "Gateway", stock: 6, status: "Ready" },
      { id: 2, name: "Sensor", stock: 3, status: "Watch" },
      { id: 3, name: "Panel", stock: 9, status: "Ready" },
    ];
  }
}

/** @type {import("../../runtime/web-component.ts").AngularElementOptions<InventoryScope>} */
const inventoryMicroapp = {
  ngModule: {
    directives: {
      ngClass: classDirective,
      ngClick: ngClickDirective,
      ngRepeat: ngRepeatDirective,
    },
    services: {
      inventoryStore: InventoryStore,
    },
  },
  component: {
    shadow: true,
    inputs: {
      title: {
        type: String,
        default: "Inventory Microapp",
      },
      resetToken: Number,
    },
    scope: {
      items: [],
      total: 0,
    },
    template: `
      <div>
        <style>
          :host {
            display: block;
            color: #202124;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .shell {
            display: grid;
            gap: 14px;
            border: 1px solid #d9dde5;
            border-radius: 8px;
            background: #ffffff;
            padding: 18px;
          }

          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 650;
            letter-spacing: 0;
          }

          .count {
            color: #475467;
            font-size: 13px;
          }

          .items {
            display: grid;
            gap: 8px;
          }

          .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 10px;
            border: 1px solid #eaecf0;
            border-radius: 8px;
            padding: 10px 12px;
          }

          .name {
            font-weight: 650;
          }

          .meta {
            margin-top: 3px;
            color: #667085;
            font-size: 13px;
          }

          .badge {
            min-width: 54px;
            border-radius: 999px;
            padding: 3px 8px;
            background: #ecfdf3;
            color: #027a48;
            font-size: 12px;
            font-weight: 650;
            text-align: center;
          }

          .badge.is-watch {
            background: #fff6e5;
            color: #ad5b00;
          }

          button {
            min-height: 32px;
            border: 1px solid #c9d1df;
            border-radius: 6px;
            background: #ffffff;
            color: #202124;
            cursor: pointer;
            font: inherit;
            font-size: 13px;
            font-weight: 650;
            padding: 0 10px;
          }

          button:hover {
            background: #f2f4f7;
          }

          .primary {
            border-color: #2563eb;
            background: #2563eb;
            color: #ffffff;
          }

          .primary:hover {
            background: #1d4ed8;
          }
        </style>
        <section class="shell">
          <header>
            <h2>{{ title }}</h2>
            <span class="count">{{ total }} units</span>
          </header>

          <div class="items">
            <article class="row" ng-repeat="item in items" data-index="id">
              <div>
                <div class="name">{{ item.name }}</div>
                <div class="meta">Stock {{ item.stock }}</div>
              </div>
              <span class="badge" ng-class="{ 'is-watch': item.status === 'Watch' }">
                {{ item.status }}
              </span>
              <button type="button" ng-click="ship(item)">Ship</button>
            </article>
          </div>

          <button type="button" class="primary" ng-click="restock()">
            Restock all
          </button>
        </section>
      </div>
    `,
    connected({ dispatch, injector, scope }) {
      const store = injector.get("inventoryStore");

      /** @param {string} action */
      function notify(action) {
        dispatch("inventory-change", {
          action,
          total: scope.total,
        });
      }

      function updateTotal() {
        scope.total = scope.items.reduce(
          (total, item) => total + item.stock,
          0,
        );
      }

      function reset(action = "ready") {
        scope.items = store.createItems();
        updateTotal();
        notify(action);
      }

      scope.ship = (item) => {
        scope.items = scope.items.map((nextItem) => {
          if (nextItem.id !== item.id) return nextItem;

          const stock = Math.max(0, nextItem.stock - 1);

          return {
            ...nextItem,
            stock,
            status: stock <= 3 ? "Watch" : "Ready",
          };
        });
        updateTotal();
        notify("ship");
      };

      scope.restock = () => {
        scope.items = scope.items.map((item) => ({
          ...item,
          stock: item.stock + 4,
          status: "Ready",
        }));
        updateTotal();
        notify("restock");
      };

      scope.$watch("resetToken", (token, previous) => {
        if (token === previous) return;
        reset("host-reset");
      });

      reset();
    },
  },
};

defineAngularElement("aw-inventory-microapp", inventoryMicroapp);
