# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

## Specification

### Components

A component is an executable unit, represented in memory as an object with two properties, `producer` and `consumer`, each of which is a collection of components. Each component encapsulates and joins together other components.

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
- `>` is the **pull** operator. It denotes a consumer.
- `|` is the **pipe** operator. It denotes a component that is both a consumer and a producer. The compiler "expands" each pipe into a new consumer stream that encapsulates the original component as its producer.

Here is the source of a stream that constructs a component to render the text `Hello World!` after a delay of 1000 milliseconds:

```
stream
< 'Hello World!'
| delay 1000
> render
```

And here is its compiler-expanded version:

```
stream
< 'Hello World!'
> stream
  < delay 1000
  > render
```

Finally, the compiler constructs a new component object. Each stream maps to a new component, each push operator maps to a new producer, and each pull operator maps to a new consumer:

```
component
* producer =
  - value-producer
    . value = 'Hello World!'
* consumer =
  - component
    * producer =
      - delay
        . state = value-producer
          . value = 1000
    * consumer =
      - render
```
