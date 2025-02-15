import { useEffect, useRef } from "react";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { checkIfYMapIsInitializedForYTree, YTree } from "yjs-tree";

function App() {
  const ydoc1 = useRef(null);
  const ydoc2 = useRef(null);
  const provider1 = useRef(null);
  const provider2 = useRef(null);
  const ytree1 = useRef(null);
  const ytree2 = useRef(null);

  useEffect(() => {
    // Step 1: Create Y.Doc instances
    ydoc1.current = new Y.Doc();
    ydoc2.current = new Y.Doc();

    // Step 2: Set up WebRTC providers
    provider1.current = new WebrtcProvider("ydoc-room", ydoc1.current);
    provider2.current = new WebrtcProvider("ydoc-room", ydoc2.current);

    // Step 3: Initialize ytree1
    const yMap1 = ydoc1.current.getMap("ymap").set("ytree", new Y.Map());
    ytree1.current = new YTree(yMap1);

    // Step 4: Monitor changes in ydoc2's ymap for ytree2 initialization
    const yMap2 = ydoc2.current.getMap("ymap");

    const initializeYTree2 = () => {
      if (
        !ytree2.current &&
        checkIfYMapIsInitializedForYTree(yMap2.get("ytree"))
      ) {
        ytree2.current = new YTree(yMap2.get("ytree"));
        console.log("ytree2 initialized and synced with ytree1");
        yMap2.unobserve(initializeYTree2);
      }
    };

    // Observe changes in yMap2
    yMap2.observe(() => {
      initializeYTree2();
    });

    // Clean up WebRTC providers and observers on unmount
    return () => {
      provider1.current.destroy();
      provider2.current.destroy();
      yMap2.unobserve(initializeYTree2);
    };
  }, []);

  return (
    <>
    <h1 className="text-6xl font-bold underline"> Hello world! </h1>;
    <button onClick={() => {
      console.log(ytree1.computedMap);
      console.log(ytree2.computedMap);
    }}>Click</button>
    </>
  );
}

export default App;
