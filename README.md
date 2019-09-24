# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

## Specification

### Components

A component is an executable unit, represented in memory as a component object, which has two properties, `producer` and `consumer`, each of which is a collection of components. A component encapsulates and joins together other components.

Here is the source of the `component` type:
```
component = type (In Join Out)
* producer = this (In Unknown Join)
* consumer = this (Join Unknown Out)
```

The `component` type has three variables:

- `In` is the type of the component's input and its producers' inputs.
- `Join` is the type of the component's producers' outputs and its consumer's inputs.
- `Out` is the type of the component's output and its consumers' outputs.

### Streams

A stream is the prototype for one or more components. The producers and consumers of these components are defined by three operators:

- `<` is the **push** operator. It denotes a producer.
- `|` is the **pipe** operator. It denotes a component which is a producer and a consumer.
- `>` is the **pull** operator. It denotes a consumer.

Here is the source of a stream which constructs a component that renders the text `Hello World!` after a delay of 1000 milliseconds:
```
stream
< 'Hello World!'
| delay 1000
> render
```
