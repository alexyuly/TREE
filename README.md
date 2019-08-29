# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

A TREE application is written as a *formula*, which is the definition for a stream of execution. A formula is composed of other formulas, referenced by name. Formula names are resolved as file system paths, relative to the current directory of the original containing formula or to any directory within the *Path*. The TREE Path includes the file system Path, the default TREE Path, and the local TREE Path. *(TODO: Elaborate on Path resolution... not fascinating, but very important.)*

A formula defines a stream of execution, flowing from top to bottom. Values, units of data, are either inserted into or removed from the stream by other formulas contained within the original. A *producer* is a type of formula that inserts values into a stream. A *consumer* is a type of formula that removes values from a stream. A *transformer* is a type of formula that is both a producer and a consumer.

A producer is referenced with a left angle bracket (`<`).

A consumer is referenced with a right angle bracket (`>`).

A transformer is referenced with a vertical pipe (`|`).

## Examples

```
formula Hello-World
< 'Hello, world!'
> render

formula Count-To-Ten
< 1
< < [count] delay 500 | under 10
  ? | add 1
> [count]
> render

formula Html-Counter
< . count 1
< < html/click 'increment' | [state] get.count | under 10
  ? | [state] update.count add 1
  : | [state] set.count 1
> [state]
> | html/document
    . body
      . children
        - html/button
          . id 'increment'
          . children
            - | get.count
  > html/render
```
