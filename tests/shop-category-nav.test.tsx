import {expect,it,vi} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import ShopCategoryNav from '@/components/shop/ShopCategoryNav'

it('exposes the selected category and sends the original slug when choosing another',()=>{
  const onSelect=vi.fn()
  const props={items:[{slug:'all',label:'All'},{slug:'broeken',label:'Trousers'}],onSelect,label:'Category',previousLabel:'Previous categories',nextLabel:'Next categories'}
  const {rerender}=render(<ShopCategoryNav {...props} active="all"/>)
  expect(screen.getByRole('button',{name:'All'})).toHaveAttribute('aria-pressed','true')
  fireEvent.click(screen.getByRole('button',{name:'Trousers'}))
  expect(onSelect).toHaveBeenCalledWith('broeken')
  rerender(<ShopCategoryNav {...props} active="broeken"/>)
  expect(screen.getByRole('button',{name:'Trousers'})).toHaveAttribute('aria-pressed','true')
  expect(screen.getByRole('button',{name:'All'})).toHaveAttribute('aria-pressed','false')
})
it('shows scroll controls only where more categories exist and scrolls the strip',()=>{
  const {container}=render(<ShopCategoryNav items={[{slug:'all',label:'All'}]} active="all" onSelect={vi.fn()} label="Category" previousLabel="Previous categories" nextLabel="Next categories"/>)
  const strip=container.querySelector('nav > div') as HTMLDivElement
  const scrollBy=vi.fn()
  Object.defineProperties(strip,{clientWidth:{value:240},scrollWidth:{value:600},scrollLeft:{value:0,writable:true},scrollBy:{value:scrollBy}})
  fireEvent.scroll(strip)
  expect(screen.queryByRole('button',{name:'Previous categories'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Next categories'}))
  expect(scrollBy).toHaveBeenCalledWith({left:180,behavior:'smooth'})
  strip.scrollLeft=360
  fireEvent.scroll(strip)
  expect(screen.queryByRole('button',{name:'Next categories'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Previous categories'}))
  expect(scrollBy).toHaveBeenLastCalledWith({left:-180,behavior:'smooth'})
})
