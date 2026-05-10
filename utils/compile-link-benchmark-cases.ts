export type CompileLinkBenchmarkCase = {
  name: string;
  template: string;
  createScopeData?: () => Record<string, unknown>;
  includeInLink?: boolean;
};

export const compileLinkBenchmarkCases: CompileLinkBenchmarkCase[] = [
  {
    name: "static tree",
    template:
      "<section><header><h1>Title</h1></header><p>Copy</p><footer>End</footer></section>",
  },
  {
    name: "text interpolation",
    template:
      "<article><h2>{{title}}</h2><p>{{description}}</p><span>{{count}}</span></article>",
    createScopeData: () => ({
      title: "AngularTS",
      description: "Reactive templates",
      count: 3,
    }),
  },
  {
    name: "bindings and events",
    template: '<button ng-click="save(item)">{{label}}</button>',
    createScopeData: () => ({
      item: { active: true },
      label: "Save",
      save() {},
    }),
  },
  {
    name: "repeat list",
    template:
      '<ul><li ng-repeat="item in items"><span>{{item.name}}</span><button ng-click="select(item)">Select</button></li></ul>',
    includeInLink: false,
    createScopeData: () => ({
      items: [
        { id: 1, name: "Install" },
        { id: 2, name: "Build" },
        { id: 3, name: "Ship" },
      ],
      select() {},
    }),
  },
  {
    name: "nested template",
    template:
      '<section ng-if="ready"><header ng-bind="title"></header><div ng-repeat="group in groups"><h3>{{group.name}}</h3><p ng-repeat="item in group.items">{{item.label}}</p></div></section>',
    includeInLink: false,
    createScopeData: () => ({
      ready: true,
      title: "Guide",
      groups: [
        {
          name: "Basics",
          items: [{ label: "Install" }, { label: "Component" }],
        },
        {
          name: "Runtime",
          items: [{ label: "Routing" }, { label: "State" }],
        },
      ],
    }),
  },
];
