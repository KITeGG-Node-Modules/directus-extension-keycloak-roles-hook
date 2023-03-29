import assert from 'assert'

const cleanPermission = p => {
  const copy = Object.assign({}, p)
  delete copy.id
  delete copy.role
  return copy
}
const deepEqual = (a, b) => {
  try {
    assert.deepEqual(a, b)
    return true
  }
  catch {
    return false
  }
}
export async function copyPermissions ({ source, target, ItemsService }, context) {
  const permissionsService = new ItemsService('directus_permissions', context)

  const sourcePermissions = await permissionsService.readByQuery({
    filter: {role: source.id}
  })
  const targetPermissions = await permissionsService.readByQuery({
    filter: {role: target.id}
  })
  for (const sp of sourcePermissions) {
    const existsInTarget = targetPermissions.find(tp => {
      return deepEqual(cleanPermission(sp), cleanPermission(tp))
    });
    if (!existsInTarget) {
      const permission = Object.assign(
        {role: target.id},
        cleanPermission(sp)
      )
      await permissionsService.createOne(permission)
    }
  }
  for (const tp of targetPermissions) {
    const existsInSource = sourcePermissions.find(sp => {
      return deepEqual(cleanPermission(sp), cleanPermission(tp))
    });
    if (!existsInSource) {
      await permissionsService.deleteOne(tp.id)
    }
  }
}
