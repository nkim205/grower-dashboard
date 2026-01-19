// App.jsx
import { useState } from "react"
import Data from "./pages/Data.jsx"
import Component from "@/components/dashboard-components.tsx"
import "./App.css"
import Map3D from "./pages/Map3D.jsx"
import Team from "./pages/Team.jsx"


function BlankPage() {
  return <div className="flex-1 h-full w-full" />
}

function App() {
  const [page, setPage] = useState("home")
  const [searchTerm, setSearchTerm] = useState("")

  let content
  switch (page) {
    case "data":
      content = <Data />
      break
    case "team":
      content = <Team />
      break
    case "home":
    default:
      content = (
        <div className="w-full h-full">
          <Map3D searchTerm={searchTerm} />
        </div>
      )
  }

  return (
    <div className="h-screen flex flex-col">
      <Component
        currentPage={page}
        onNavigate={setPage}
        onSearch={(q) => {
          setPage("home")          // make sure map is visible
          setSearchTerm(q)
        }}
      />
      <main className="flex-1 min-h-0">
        {content}
      </main>
    </div>
  )
}

export default App
