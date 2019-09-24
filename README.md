# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

## Specification

### Streams

Streams are prototypes for components.

A component is an executable unit, represented in memory as a component object. This object has two properties: producers and consumers, each of which is itself a collection of components. The component type has three variables:
- `In` is the type of the component's input and its producers' inputs.
- `Thru` is the type of the component's producers' outputs and its consumer's inputs.
- `Out` is the type of the component's output and its consumers' outputs.

#### Example: working backwards from source code

```
# Original source code

stream
< 'Hello, World!'
| delay 1000
> render


# Expanded source code

stream
< 'Hello, World!'
> < delay 1000
  > render


# Component object

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


# Types

component = type (In Thru Out)
* producer = this (In Unknown Thru)
* consumer = this (Thru Unknown Out)

value-producer = type (Value)
~ component (Void Void Value)
. value = Value

delay = type (Value)
~ component (Value Void Value)
. state = component (Unknown Unknown number)

render = type (Value)
~ component (Value Void Void)

```
