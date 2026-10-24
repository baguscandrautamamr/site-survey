import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import UpdateBanner from './UpdateBanner'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <UpdateBanner />
    </>
  )
}
