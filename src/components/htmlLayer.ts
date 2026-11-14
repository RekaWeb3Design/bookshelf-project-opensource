import {createRef} from 'react'

// DOM layer the open book's Html page is portalled into. CameraRig shifts it to follow the off-center frustum.
export const htmlLayer = createRef<HTMLDivElement>()
