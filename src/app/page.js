'use client';
import { useEffect, useRef, useState } from "react";
import { checkForYTree, YTree } from "yjs-orderedtree";
import * as Y from "yjs";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";


/**
 * Sets up in-memory sync between two Yjs docs.
 * Whenever doc1 updates, apply changes to doc2, and vice versa.
 * Returns a cleanup function that removes the listeners.
 */
function setupInMemorySync(doc1, doc2) {
  const handleDoc1Update = (update, origin) => {
    Y.applyUpdate(doc2, update, origin);
  };
  const handleDoc2Update = (update, origin) => {
    Y.applyUpdate(doc1, update, origin);
  };

  doc1.on("update", handleDoc1Update);
  doc2.on("update", handleDoc2Update);

  return () => {
    doc1.off("update", handleDoc1Update);
    doc2.off("update", handleDoc2Update);
  };
}

export default function Home() {
  console.log("home rendered");
  const ydoc1 = useRef(new Y.Doc());
  const ydoc2 = useRef(new Y.Doc());

  const [isMounted, setIsMounted] = useState(false);

  const [isPaused, setIsPaused] = useState(false);

  // Keep the current cleanup function in a ref so we can remove/re-add listeners
  const cleanupRef = useRef(null);

  /**
 * Catch up doc1 with doc2 and vice versa
 * by exchanging states before re-attaching listeners.
 */
  const exchangeStates = () => {
    // doc2 -> doc1
    const update2 = Y.encodeStateAsUpdate(ydoc2.current);
    Y.applyUpdate(ydoc1.current, update2);
    // doc1 -> doc2
    const update1 = Y.encodeStateAsUpdate(ydoc1.current);
    Y.applyUpdate(ydoc2.current, update1);
  };


  const pauseSync = () => {
    console.log("Pausing local synchronization...");
    console.log("Pausing sync...");
    if (cleanupRef.current) {
      cleanupRef.current(); // remove the 'update' listeners
      cleanupRef.current = null;
    }

  }

  const resumeSync = () => {
    console.log("Resuming sync...");

    // 1. Catch up both docs by exchanging states
    exchangeStates();

    // 2. Re-attach the event listeners
    if (!cleanupRef.current) {
      cleanupRef.current = setupInMemorySync(ydoc1.current, ydoc2.current);
    }
  }

  const toggleSync = () => {
    console.log("IS PAUSED?: ", isPaused);
    if (isPaused) {
      setIsPaused(false);
      resumeSync();
    }
    else {
      setIsPaused(true);
      console.log(isPaused);
      pauseSync();
    }
  }

  useEffect(() => {
    resumeSync();

    // Initialize YTree for ydoc1
    const yMap1 = ydoc1.current.getMap("ymap");

    const ymapForYtree = yMap1.set("ytree", new Y.Map());

    // Setups ytree inside the ymap. (adds a root node)
    const ytree = new YTree(ymapForYtree);

    // Mark hydration as complete
    setIsMounted(true);
    // Cleanup listeners on unmount
    return () => {
      pauseSync();
    };
  }, []);

  if (!isMounted) {
    return null; // Prevent rendering until hydration is complete
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div id="ExampleContainer" className="h-full w-full flex justify-center items-center p-2 md:p-6 select-none font-mono">
        <div id="ExampleBody" className="h-full w-full min-w-[20rem] min-h-[30rem] max-w-[60rem] max-h-[50rem] flex flex-col items-center md:flex-row text-2xl relative rounded-3xl bg-neutral-800 ">
          <div id="PauseButtonContainer" className="absolute h-12 w-12  top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2">
            <button id="PauseButton" className="w-full h-full rounded-xl border-[3px] border-neutral-500 bg-neutral-800 flex items-center justify-center hover:bg-neutral-900" onClick={toggleSync}>
              {!isPaused && <svg xmlns="http://www.w3.org/2000/svg" width={60} height={60} viewBox="0 0 24 24"><path fill="#fff" d="M15 18q-.402 0-.701-.299T14 17V7q0-.402.299-.701T15 6h1.5q.402 0 .701.299T17.5 7v10q0 .402-.299.701T16.5 18zm-7.5 0q-.402 0-.701-.299T6.5 17V7q0-.402.299-.701T7.5 6H9q.402 0 .701.299T10 7v10q0 .402-.299.701T9 18z"></path></svg>}
              {isPaused && <svg xmlns="http://www.w3.org/2000/svg" width={100} height={100} viewBox="0 0 24 24"><path fill="#fff" d="M9 15.714V8.287q0-.368.244-.588q.243-.22.568-.22q.102 0 .213.028q.11.027.211.083l5.843 3.733q.186.13.28.298q.093.167.093.379t-.093.379t-.28.298l-5.843 3.733q-.101.055-.213.083t-.213.028q-.326 0-.568-.22T9 15.714"></path></svg>}
            </button>
          </div>

          <Pane paneName={"A"} ymapReference={ydoc1.current.getMap("ymap")} />

          <div id="divider" className="w-[97%] h-px md:w-px md:h-[97%] bg-neutral-500"></div>

          <Pane paneName={"B"} ymapReference={ydoc2.current.getMap("ymap")} />
        </div>
      </div>
    </DndProvider>
  );
}

/**
 * 
 * @param {{ymapReference: Y.Map}} param0  
 */
const Pane = ({ paneName, ymapReference }) => {
  console.log("pane rendered");
  const [ymapState, setYmapState] = useState(ymapReference.toJSON());

  useEffect(() => {
    ymapReference.observe(() => {
      console.log("ymap observer fired");
      setYmapState(ymapReference.toJSON());
    });
  }, [ymapReference]);


  if (ymapReference.has("ytree") && checkForYTree(ymapReference.get('ytree'))) {
    return (
      <div id="PaneContainer" className="w-full h-full flex flex-col pb-5">
        <div id="PaneHeader" className="h-fit pt-9 md:p-10 text-xl md:text-5xl flex items-center justify-center">
          <h1>Directory {paneName}</h1>
        </div>
        <div id="PaneBody" className="flex-grow flex p-3 md:p-6 scrollbar overflow-y-scroll h-0 border-neutral-600 text-xl md:text-2xl" >
          <YDirectory yTreeReference={new YTree(ymapReference.get("ytree"))} />
        </div>
      </div >
    )
  }
  else {
    return <p>Loading...</p>
  }
}

/**
 * 
 * @param {{yTreeReference: YTree}} param0 
 */
const YDirectory = ({ yTreeReference }) => {
  console.log("YDirectory rendered");
  const [rootChildrenState, setRootChildrenState] = useState(null);

  useEffect(() => {
    const updateRootChildrenState = () => {
      setRootChildrenState(yTreeReference.getNodeChildrenFromKey("root"));

    }
    yTreeReference.observe(updateRootChildrenState);

    return () => {
      yTreeReference.unobserve(updateRootChildrenState)
    }
  }, [yTreeReference]);

  const createRootChild = () => {
    yTreeReference.createNode("root", yTreeReference.generateNodeKey(), new Y.Text("new node"));
  }

  return (
    <div id="RootContainer" className="h-fit w-full min-h-0">
      <div id="RootHeader" className="flex justify-between items-center pb-1 h-10 ">
        <p>root</p>
        <button className="hover:bg-neutral-900 h-full w-10 flex justify-center items-center" onClick={createRootChild}><svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24"><path fill="#fff" d="M12 20q-.213 0-.357-.144T11.5 19.5v-7h-7q-.213 0-.356-.144T4 11.999t.144-.356t.356-.143h7v-7q0-.213.144-.356T12.001 4t.356.144t.143.356v7h7q.213 0 .356.144t.144.357t-.144.356t-.356.143h-7v7q0 .213-.144.356t-.357.144"></path></svg></button>
      </div>

      <div id="RootBodyContainer" className="w-full pl-3">
        <div id="RootBody" className="flex flex-col w-full pl-3 border-l-4 border-neutral-500">
          {rootChildrenState !== null && (
            yTreeReference.sortChildrenByOrder(rootChildrenState, "root").map((nodeKey) => {
              return (<div id="RootChild" key={nodeKey}> <DirectoryNode yTreeReference={yTreeReference} nodeKey={nodeKey} /> </div>)
            })
          )}
        </div>
      </div>
    </div>

  );
}

/**
 * 
 * @param {{yTreeReference: YTree}} param0 
 */
const DirectoryNode = ({ yTreeReference, nodeKey }) => {
  const dndref = useRef(null);
  const nodeYtext = useRef(yTreeReference.getNodeValueFromKey(nodeKey));

  const [nodeChildrenState, setNodeChildrenState] = useState(yTreeReference.getNodeChildrenFromKey(nodeKey));
  const [nodeLabel, setNodeLabel] = useState(nodeYtext.current.toString());

  const [areaSelected, setAreaSelected] = useState("top"); // "top" | "middle" | "bottom"


  const createChild = () => {
    yTreeReference.createNode(nodeKey, yTreeReference.generateNodeKey(), new Y.Text("new node"));
  }

  const saveNodeName = (name) => {
    nodeYtext.current.delete(0, nodeYtext.current.length);
    nodeYtext.current.insert(0, name);
  }

  useEffect(() => {
    const updateNodeLabel = () => {
      setNodeLabel(nodeYtext.current.toString());
    }

    const updateNodeChildrenState = () => {
      console.log("ytree observer fired");
      setNodeChildrenState(yTreeReference.getNodeChildrenFromKey(nodeKey));
      console.log(nodeChildrenState);
    }

    nodeYtext.current.observe(updateNodeLabel);
    yTreeReference.observe(updateNodeChildrenState);

    return () => {
      nodeYtext.current.unobserve(updateNodeLabel);
      yTreeReference.unobserve(updateNodeChildrenState);
    }
  }, [nodeKey])



  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ITEM",
    item: {
      id: nodeKey,
      type: "node",
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOverCurrent }, drop] = useDrop({
    accept: "ITEM",
    hover: (draggedItem, monitor) => {
      if (!dndref.current) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = dndref.current?.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      const buffer = 10;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      console.log(hoverClientY, 0, hoverBoundingRect.bottom - hoverBoundingRect.top)

      if (hoverClientY < buffer) {
        setAreaSelected("top");
      } else if (hoverClientY > hoverBoundingRect.bottom - hoverBoundingRect.top - buffer) {
        setAreaSelected("bottom");
      } else {
        setAreaSelected("middle")
      }
    },

    drop: (draggedItem, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) {
        return;
      }

      console.log("Dropped!");

      if (areaSelected !== "middle") {
        if (yTreeReference.getNodeChildrenFromKey(yTreeReference.getNodeParentFromKey(nodeKey)).includes(draggedItem.id)) {
          console.log("is sibling");

          if (areaSelected === 'top') {
            yTreeReference.setNodeBefore(draggedItem.id, nodeKey);
          }

          if (areaSelected === 'bottom') {
            yTreeReference.setNodeAfter(draggedItem.id, nodeKey);
          }
        }
        else {
          console.log("not sibling")
          yTreeReference.moveChildToParent(draggedItem.id, yTreeReference.getNodeParentFromKey(nodeKey));

          if (areaSelected === 'top') {
            yTreeReference.setNodeBefore(draggedItem.id, nodeKey);
          }

          if (areaSelected === 'bottom') {
            yTreeReference.setNodeAfter(draggedItem.id, nodeKey);
          }
        }
      }
      else {
        console.log("dropped middle")
        if (yTreeReference.getNodeChildrenFromKey(nodeKey).includes(draggedItem.id)) {
          yTreeReference.setNodeOrderToEnd(draggedItem.id, nodeKey);
        }
        else {
          yTreeReference.moveChildToParent(draggedItem.id, nodeKey);
          yTreeReference.setNodeOrderToEnd(draggedItem.id, nodeKey);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      isOverCurrent: monitor.isOver({ shallow: true }),
    }),
  });

  drag(drop(dndref));

  return (
    <div ref={dndref} id="DirectoryNode" className={`
        ${isDragging ? "opacity-20" : ""} 
        
        my-1

        px-[6px]

        ${(() => {
        if (isOverCurrent) {

          if (areaSelected === 'top')
            return "border-t-2 border-b-2 border-b-transparent  border-t-blue-500";
          else if (areaSelected === 'bottom')
            return "border-b-2 border-t-2 border-t-transparent border-b-blue-500"
          else if (areaSelected === 'middle')
            return "border-y-2 border-transparent bg-blue-500 bg-opacity-50"

        } else {
          return "border-2 border-neutral-700 rounded-lg ";
        }
      })()}

      
      `}>
      <div id="DirectoryNodeHeader" className="flex justify-between items-center h-10">
        <p className="flex items-center justify-start h-full pl-1"><span className="min-w-4 text-center">{nodeLabel}</span> <NameChangeInput onSave={saveNodeName} /></p>
        <button className="hover:bg-neutral-900 h-full w-10 flex justify-center items-center" onClick={createChild}><svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24"><path fill="#fff" d="M12 20q-.213 0-.357-.144T11.5 19.5v-7h-7q-.213 0-.356-.144T4 11.999t.144-.356t.356-.143h7v-7q0-.213.144-.356T12.001 4t.356.144t.143.356v7h7q.213 0 .356.144t.144.357t-.144.356t-.356.143h-7v7q0 .213-.144.356t-.357.144"></path></svg></button>
      </div>
      <div id="DirectoryNodeBodyContainer" className="w-full pl-3">
        <div id="DirectoryNodeBody" className="flex flex-col w-full border-l-4 border-neutral-500 pl-3">
          {nodeChildrenState !== null && (
            yTreeReference.sortChildrenByOrder(nodeChildrenState, nodeKey).map((nodeKey) => {
              return (<div id="DirectoryNodeChild" key={nodeKey}> <DirectoryNode yTreeReference={yTreeReference} nodeKey={nodeKey} /> </div>)
            })
          )}
        </div>
      </div>
    </div>
  )
}

const NameChangeInput = ({ onSave }) => {
  const [name, setName] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setName(value);
  }

  return (
    <span className="ml-2 text-lg h-full flex justify-start items-center">
      <input className="w-20 px-2 bg-neutral-700 rounded-sm" placeholder="change" name="name" type="text" onChange={handleChange} value={name} />
      <button
        className="hover:bg-neutral-900 ml-1 h-full w-10 flex justify-center items-center"
        onClick={() => {
          onSave(name)
          setName("");
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><path fill="#fff" d="m9.55 15.88l8.802-8.801q.146-.146.344-.156t.363.156t.166.357t-.165.356l-8.944 8.95q-.243.243-.566.243t-.566-.243l-4.05-4.05q-.146-.146-.152-.347t.158-.366t.357-.165t.357.165z"></path></svg>
      </button>
    </span>
  )
};