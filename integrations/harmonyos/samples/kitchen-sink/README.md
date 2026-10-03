# AngularTS Native kitchen sink for HarmonyOS

This standalone Stage-model application renders every native element and lists
every property, event, method, and capability from the shared catalogs. The
page is generated, so a new contract makes checks fail until the app includes
it.

Build after installing the official HarmonyOS command-line tools:

```sh
make -C integrations/harmonyos/samples/kitchen-sink compile
```
