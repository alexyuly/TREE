import * as assert from "assert";

interface Spec {
  type: string;
  props: {};
}

interface StaticSpec extends Spec {
  type: string;
  props: {
    state: Spec;
  };
}

interface ComponentSpec extends Spec {
  props: {
    producers: Spec[];
    consumers: Spec[];
  };
}

interface GateSpec extends Spec {
  props: {
    conditions: Spec[];
    positive: Spec;
  };
}

interface SwitchSpec extends GateSpec {
  props: {
    conditions: Spec[];
    positive: Spec;
    negative: Spec;
  };
}

interface ValueSpec extends Spec {
  props: {
    value: unknown;
  };
}

interface ListenerSpec extends Spec {
  props: {
    key: string;
  };
}

interface BroadcastSpec extends Spec {
  props: {
    key: string;
  };
}

class Store<T> {
  private _state: T;

  constructor(spec: Spec, scope: StreamScope) {
    Stream.create(spec, [new StateListener(this)], scope);
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

class StreamScope {
  private readonly _broadcasts = new Map<string, Broadcast<unknown>>();

  addBroadcast(key: string, broadcast: Broadcast<unknown>) {
    assert(!this._broadcasts.has(key));
    this._broadcasts.set(key, broadcast);
  }

  addListeners(key: string, listeners: Listener<unknown>[]) {
    this._broadcasts.get(key).addListeners(listeners);
  }
}

abstract class Stream<O, I> {
  static create(
    spec: Spec,
    listeners: Listener<unknown>[] = [],
    scope = new StreamScope()
  ): Stream<unknown, unknown> {
    switch (spec.type) {
      case "component":
        return new Component(spec as ComponentSpec, listeners, scope);
      case "gate":
        return new Gate(spec as GateSpec, listeners, scope);
      case "switch":
        return new Switch(spec as SwitchSpec, listeners, scope);
      case "value":
        return new Value(spec as ValueSpec, listeners, scope);
      default:
        return new (require(`./api/${spec.type}.tree`)).default(
          spec,
          listeners,
          scope
        );
    }
  }

  private _input: I;
  private readonly _listeners: Listener<O>[];

  protected constructor(
    spec: Spec,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    this._listeners = listeners;
  }

  abstract run(): void;

  get input() {
    return this._input;
  }

  set input(value) {
    this._input = value;
    this.run();
  }

  set output(value: O) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

abstract class StaticStream<O, I, S> extends Stream<O, I> {
  private readonly _store: Store<S>;

  constructor(spec: StaticSpec, listeners: Listener<O>[], scope: StreamScope) {
    super(spec, listeners, scope);
    this._store = new Store(spec.props.state, scope);
  }

  get state() {
    return this._store.state;
  }
}

class Component<O, I, J> extends Stream<O, I> {
  private readonly _producers: Listener<I>[];

  constructor(
    spec: ComponentSpec,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);

    const consumers: Listener<J>[] = [];
    for (const consumerSpec of spec.props.consumers) {
      let consumer: Listener<J>;
      if (consumerSpec.type === "broadcast") {
        const broadcast = new Broadcast();
        scope.addBroadcast(
          (consumerSpec as BroadcastSpec).props.key,
          broadcast
        );
        consumer = broadcast;
      } else {
        consumer = new InputListener(
          Stream.create(consumerSpec, [new OutputListener(this)], scope)
        );
      }
      consumers.push(consumer);
    }

    this._producers = [];
    for (const producerSpec of spec.props.producers) {
      if (producerSpec.type === "listener") {
        scope.addListeners((producerSpec as ListenerSpec).props.key, consumers);
      } else {
        this._producers.push(
          new InputListener(Stream.create(producerSpec, consumers, scope))
        );
      }
    }
  }

  run() {
    for (const producer of this._producers) {
      producer.send(this.input);
    }
  }
}

abstract class Condition<T> {
  static create(spec: Spec, scope = new StreamScope()): Condition<unknown> {
    switch (spec.type) {
      default:
        return new (require(`./api/${spec.type}.tree`)).default(spec, scope);
    }
  }

  constructor(spec: Spec, scope: StreamScope) {}

  abstract test(input: T): boolean;
}

abstract class StaticCondition<T, S> extends Condition<T> {
  private readonly _store: Store<S>;

  constructor(spec: StaticSpec, scope: StreamScope) {
    super(spec, scope);
    this._store = new Store(spec.props.state, scope);
  }

  get state() {
    return this._store.state;
  }
}

class Gate<O, I> extends Stream<O, I> {
  private _conditions: Condition<I>[];
  private _positive: Stream<O, I>;

  constructor(spec: GateSpec, listeners: Listener<O>[], scope: StreamScope) {
    super(spec, listeners, scope);
    this._positive = Stream.create(
      spec.props.positive,
      [new OutputListener(this)],
      scope
    ) as Stream<O, I>;
    this._conditions = [];
    for (const conditionSpec of spec.props.conditions) {
      this._conditions.push(Condition.create(conditionSpec, scope));
    }
  }

  run() {
    let conditionResult = false;
    for (const condition of this._conditions) {
      if (condition.test(this.input)) {
        conditionResult = true;
      } else {
        break;
      }
    }
    if (conditionResult) {
      this._positive.input = this.input;
    }
    return conditionResult;
  }
}

class Switch<O, I> extends Gate<O, I> {
  private _negative: Stream<O, I>;

  constructor(spec: SwitchSpec, listeners: Listener<O>[], scope: StreamScope) {
    super(spec, listeners, scope);
    this._negative = Stream.create(
      spec.props.negative,
      [new OutputListener(this)],
      scope
    ) as Stream<O, I>;
  }

  run() {
    let conditionResult = super.run();
    if (!conditionResult) {
      this._negative.input = this.input;
    }
    return conditionResult;
  }
}

class Value<T> extends Stream<T, null> {
  constructor(spec: ValueSpec, listeners: Listener<T>[], scope: StreamScope) {
    super(spec, listeners, scope);
    this.output = spec.props.value as T;
  }

  run() {}
}

abstract class Listener<T> {
  abstract send(value: T): void;
}

class Broadcast<T> extends Listener<T> {
  private readonly _listeners: Listener<T>[] = [];

  addListeners(listeners: Listener<T>[]) {
    this._listeners.push(...listeners);
  }

  send(value: T) {
    setTimeout(() => {
      for (const listener of this._listeners) {
        listener.send(value);
      }
    }, 0);
  }
}

class OutputListener<T> extends Listener<T> {
  private readonly _stream: Stream<T, unknown>;

  constructor(stream: Stream<T, unknown>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.output = value;
  }
}

class InputListener<T> extends Listener<T> {
  private readonly _stream: Stream<unknown, T>;

  constructor(stream: Stream<unknown, T>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.input = value;
  }
}

class StateListener<T> extends Listener<T> {
  private readonly _store: Store<T>;

  constructor(store: Store<T>) {
    super();
    this._store = store;
  }

  send(value: T) {
    this._store.state = value;
  }
}

export { Condition, StaticCondition, StaticStream, Stream };

export default function main(spec: Spec) {
  Stream.create(spec);
}
