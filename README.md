# TREE

**TREE**, The Reactive Execution Engine, is a system for writing software applications.

## The Big Idea

Every software application can be reduced to a combination of
- a *type* `T`,
- *actors* which produce `T` values, and
- *reactors* which consume `T` values.

A stream which combines an actor with a reactor looks like this:

```
< act
> react
```

A series of actors, followed by a series of reactors, will cause values to flow from the outputs of the actors, to the inputs of the reactors.

A special reactor called a *loop* broadcasts values to other actors:

```
< start
< reuse [Loop]
> [Loop]
> react
```
