export interface Store {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  name: string
  packageType: string
  duration: number
  durationUnit: string
  price: number
}

export interface ProductDetail extends Product {
  store: Store
}
