import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, MenuItem, BillingType } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, UtensilsCrossed, FolderOpen, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from '@/services/menuService';
import { createInventoryEntry } from '@/services/inventoryService';
import { useBranches } from '@/hooks/useMenuData';
import BranchSelector from '@/components/BranchSelector';

export default function MenuManagement() {
  const { profile, roles } = useAuth();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const isAdmin = roles.includes('admin');

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState(0);

  // Menu item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<string>('');
  const [itemBranchId, setItemBranchId] = useState<string>('');
  const [createInventory, setCreateInventory] = useState(true);
  const [initialStock, setInitialStock] = useState('50');
  
  // Bar product fields
  const [billingType, setBillingType] = useState<BillingType>('bottle_only');
  const [bottleSizeMl, setBottleSizeMl] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [servingSizeMl, setServingSizeMl] = useState('60');
  const [servingPrice, setServingPrice] = useState('');

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'item'; id: string; name: string } | null>(null);

  const isManager = roles.includes('admin') || roles.includes('manager');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getCategories(),
        getMenuItems(),
      ]);
      setCategories(categoriesData);
      setMenuItems(itemsData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // Category handlers
  function openCategoryDialog(category?: Category) {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || '');
      setCategorySortOrder(category.sort_order || 0);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategorySortOrder(categories.length);
    }
    setCategoryDialogOpen(true);
  }

  async function handleSaveCategory() {
    if (!categoryName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Category name is required' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryName,
          description: categoryDescription || undefined,
          sort_order: categorySortOrder,
        });
        toast({ title: 'Success', description: 'Category updated' });
      } else {
        await createCategory(categoryName, categoryDescription || undefined, categorySortOrder);
        toast({ title: 'Success', description: 'Category created' });
      }
      setCategoryDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  // Menu item handlers
  function openItemDialog(item?: MenuItem) {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemPrice(item.price.toString());
      setItemDescription(item.description || '');
      setItemImageUrl(item.image_url || '');
      setItemCategoryId(item.category_id || '');
      setItemBranchId(item.branch_id || '');
      setCreateInventory(false);
      // Bar fields
      setBillingType(item.billing_type || 'bottle_only');
      setBottleSizeMl(item.bottle_size_ml?.toString() || '');
      setCostPrice(item.cost_price?.toString() || '');
      setServingSizeMl(item.serving_size_ml?.toString() || '60');
      setServingPrice(item.serving_price?.toString() || '');
    } else {
      setEditingItem(null);
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setItemImageUrl('');
      setItemCategoryId(selectedCategory || '');
      setItemBranchId(selectedBranchId || profile?.branch_id || '');
      setCreateInventory(true);
      setInitialStock('50');
      // Reset bar fields
      setBillingType('bottle_only');
      setBottleSizeMl('');
      setCostPrice('');
      setServingSizeMl('60');
      setServingPrice('');
    }
    setItemDialogOpen(true);
  }

  async function handleSaveItem() {
    if (!itemName.trim() || !itemPrice) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and price are required' });
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid price' });
      return;
    }

    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, {
          name: itemName,
          price,
          description: itemDescription || undefined,
          image_url: itemImageUrl || undefined,
          category_id: itemCategoryId || undefined,
        });
        toast({ title: 'Success', description: 'Menu item updated' });
      } else {
        const newItem = await createMenuItem(
          itemName,
          price,
          itemCategoryId || undefined,
          itemDescription || undefined,
          itemImageUrl || undefined
        );
        
        // Create inventory entry if requested
        if (createInventory) {
          const stock = parseInt(initialStock) || 0;
          await createInventoryEntry(newItem.id, stock);
        }
        
        toast({ title: 'Success', description: 'Menu item created' });
      }
      setItemDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    try {
      await toggleMenuItemAvailability(item.id);
      toast({ title: 'Success', description: `${item.name} is now ${item.is_available ? 'unavailable' : 'available'}` });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  // Delete handlers
  function confirmDelete(type: 'category' | 'item', id: string, name: string) {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory(deleteTarget.id);
        toast({ title: 'Success', description: 'Category deleted' });
      } else {
        await deleteMenuItem(deleteTarget.id);
        toast({ title: 'Success', description: 'Menu item deleted' });
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to manage the menu.
            </p>
            <Button className="w-full mt-4" asChild>
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Menu Management</h1>
            </div>
          </div>
          <BranchSelector 
            selectedBranchId={selectedBranchId} 
            onBranchChange={setSelectedBranchId}
          />
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">Menu Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Menu Items Tab */}
          <TabsContent value="items" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedCategory || 'all'}
                  onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {filteredItems.length} items
                </span>
              </div>
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openItemDialog()}>
                    <Plus className="h-4 w-4 mr-2" />Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Margherita Pizza" />
                    </div>
                    <div className="space-y-2">
                      <Label>Price *</Label>
                      <Input type="number" step="0.01" min="0" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Optional description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input value={itemImageUrl} onChange={(e) => setItemImageUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    {isAdmin && !editingItem && (
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Select value={itemBranchId} onValueChange={setItemBranchId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {!editingItem && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label>Create inventory entry</Label>
                          <Switch checked={createInventory} onCheckedChange={setCreateInventory} />
                        </div>
                        {createInventory && (
                          <div className="space-y-2">
                            <Label>Initial Stock</Label>
                            <Input type="number" min="0" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveItem}>{editingItem ? 'Update' : 'Create'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className={!item.is_available ? 'opacity-60' : ''}>
                  <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    {!item.is_available && (
                      <Badge className="absolute top-2 right-2" variant="secondary">Unavailable</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
                        {item.category && (
                          <Badge variant="outline" className="mt-1">{item.category.name}</Badge>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Available</span>
                        <Switch checked={item.is_available} onCheckedChange={() => handleToggleAvailability(item)} />
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openItemDialog(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirmDelete('item', item.id, item.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <Card className="p-12 text-center">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No menu items yet. Add your first item to get started.</p>
              </Card>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openCategoryDialog()}>
                    <Plus className="h-4 w-4 mr-2" />Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., Appetizers" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="Optional description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input type="number" value={categorySortOrder} onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveCategory}>{editingCategory ? 'Update' : 'Create'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const itemCount = menuItems.filter(item => item.category_id === category.id).length;
                return (
                  <Card key={category.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openCategoryDialog(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirmDelete('category', category.id, category.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                      )}
                      <Badge variant="secondary">{itemCount} items</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {categories.length === 0 && (
              <Card className="p-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No categories yet. Add your first category to organize your menu.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'category' ? 'Category' : 'Menu Item'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}