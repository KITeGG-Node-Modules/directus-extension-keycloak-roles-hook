import assert from 'assert'

const cleanPermission = p => {
  const copy = Object.assign({}, p)
  delete copy.id
  delete copy.role
  return copy
}
const comparePermission = p => {
  return {
    collection: p.collection,
    action: p.action
  }
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
export async function copyPermissions ({ source, target, ItemsService, logger }, context) {
  const permissionsService = new ItemsService('directus_permissions', context)

  const sourcePermissions = await permissionsService.readByQuery({
    filter: {role: source.id},
    limit: -1
  })
  const targetPermissions = await permissionsService.readByQuery({
    filter: {role: target.id},
    limit: -1
  })
  for (const sp of sourcePermissions) {
    const existingInTarget = targetPermissions.filter(tp => {
      return deepEqual(comparePermission(sp), comparePermission(tp))
    })
    const existsInTarget = existingInTarget.pop()
    for (const p of existingInTarget) {
      await permissionsService.deleteOne(p.id)
    }
    const permission = Object.assign(
      {
        role: target.id,
        id: existsInTarget?.id
      },
      cleanPermission(sp)
    )
    await permissionsService.upsertOne(permission)
  }
  for (const tp of targetPermissions) {
    const existsInSource = sourcePermissions.find(sp => {
      return deepEqual(comparePermission(sp), comparePermission(tp))
    });
    if (!existsInSource) {
      await permissionsService.deleteOne(tp.id)
    }
  }
}
