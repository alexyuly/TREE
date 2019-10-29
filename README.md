# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

## The Big Idea

Every software application can be reduced to a combination of
- a *type* `T`,
- *producers* which produce `T` values, and
- *consumers* which consume `T` values.

A stream which combines an consumer with a producer looks like this:

```
< produce
> consume
```

A series of producers, followed by a series of consumers, will cause values to flow from the outputs of the producers to the inputs of the consumers.

A special reactor called a *loop* broadcasts values to other actors:

```
< start
< repeat [Loop]
> [Loop]
> render
```
