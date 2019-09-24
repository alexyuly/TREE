# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

## Specification

### Streams

Streams are prototypes for components.

A component has producers and consumers.

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

component = type (Input Connection Output)
* producer = this (Input Unknown Connection)
* consumer = this (Connection Unknown Output)

value-producer = type (Value)
~ component (Void Void Value)
. value = Value

delay = type (Value)
~ component (Value Void Value)
. state = component (Void Unknown number)

render = type (Value)
~ component (Value Void Void)

```
